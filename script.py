import os, json, time, logging, requests
from flask import Flask, request, jsonify

# ====== Config & Setup ======
app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

WASENDER_TOKEN = os.getenv("WASENDER_API_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Render ENV'de tanımlı

# (Opsiyonel) kök yol healthcheck
@app.route("/", methods=["GET", "POST"])
def index():
    return "ok", 200

# ====== Helpers ======
def extract_text(payload: dict):
    """
    WaSender webhook payload'ından (messages.upsert) gönderici ve metni çıkarır.
    'messages' bazen list/dict olabilir. Kendisinden gelen (fromMe=True) mesajı atlar.
    Döndürür: (sender_jid, text) veya (None, None)
    """
    try:
        if payload.get("event") != "messages.upsert":
            return None, None
        d = payload.get("data") or {}
        msg = d.get("messages")
        if isinstance(msg, list):
            msg = msg[0] if msg else None
        if not isinstance(msg, dict):
            return None, None

        if (msg.get("key") or {}).get("fromMe"):
            return None, None

        sender = (msg.get("key") or {}).get("remoteJid")
        m = msg.get("message") or {}
        text = (
            m.get("conversation")
            or (m.get("extendedTextMessage") or {}).get("text")
            or (m.get("message") or {}).get("conversation")
        )
        if sender and text:
            return sender, text.strip()
    except Exception as e:
        logging.exception("extract_text error: %s", e)
    return None, None


def send_whatsapp(to: str, text: str):
    """WaSender API ile düz metin gönder."""
    if "@s.whatsapp.net" in to:  # '905xxx@s.whatsapp.net' -> '905xxx'
        to = to.split("@")[0]
    url = "https://www.wasenderapi.com/api/send-message"
    headers = {"Authorization": f"Bearer {WASENDER_TOKEN}", "Content-Type": "application/json"}
    payload = {"to": to, "text": text}
    r = requests.post(url, headers=headers, json=payload, timeout=20)
    r.raise_for_status()
    return r.json()


def split_for_whatsapp(text: str, max_lines=3):
    """
    Cevabı WhatsApp için 3 satırlık mesaj gruplarına böler.
    Model zaten \n kullanabilir; biz de güvence için gruplayalım.
    """
    lines = str(text).split("\n")
    chunks = []
    for i in range(0, len(lines), max_lines):
        chunk = "\n".join(lines[i : i + max_lines]).strip()
        if chunk:
            chunks.append(chunk)
    return chunks or [text]


# ====== Gemini ======
try:
    import google.generativeai as genai
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")
    genai.configure(api_key=GEMINI_API_KEY)
    _gemini_ready = True
except Exception as e:
    logging.error("Gemini init error: %s", e)
    _gemini_ready = False


def ask_gemini(user_text: str) -> str:
    """
    Kısa, Türkçe ve WhatsApp uyumlu yanıt üretir.
    Yanıt 3 satırı geçerse modelin \n kullanmasını isteriz.
    """
    if not _gemini_ready:
        return f"Merhaba! Mesajını aldım: {user_text}"
    prompt = (
        "Türkçe konuş. Kısa, net ve samimi cevap ver. Markdown kullanma. "
        "Cevap 3 satırı geçerse her 3 satırda bir \\n ile yeni mesaj gibi böl. "
        f"Kullanıcı: {user_text}"
    )
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content(prompt)
        return (getattr(resp, "text", "") or "").strip() or "Şu an yanıt veremiyorum."
    except Exception as e:
        logging.exception("Gemini error: %s", e)
        return f"Merhaba! Mesajını aldım: {user_text}"


# ====== Webhook ======
@app.post("/webhook")
def webhook():
    data = request.get_json(silent=True) or {}
    sender, text = extract_text(data)

    if not sender or not text:
        logging.info("Webhook geldi ama sender/text yok (veya fromMe). Kısmi payload: %s", str(data)[:300])
        return jsonify({"ok": True})

    # AI cevabı üret
    reply = ask_gemini(text)
    # 3 satırlık parçalara böl ve gönder
    for i, chunk in enumerate(split_for_whatsapp(reply, max_lines=3)):
        try:
            send_whatsapp(sender, chunk)
            # Sonraki parçayı çok bekletmeden yolla
            if i < 10:  # güvenli bir üst sınır
                time.sleep(0.8)
        except Exception as e:
            logging.exception("Yanıt parçası gönderilemedi: %s", e)
            return jsonify({"ok": False}), 500

    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port)
