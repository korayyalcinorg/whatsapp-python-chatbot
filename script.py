import os, json, logging, requests
from flask import Flask, request, jsonify

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

WASENDER_TOKEN = os.getenv("WASENDER_API_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Şimdilik kullanmıyoruz

# --- Basit healthcheck ---
@app.get("/")
def index():
    return "ok", 200

def extract_text(payload: dict):
    """
    WaSender 'messages.upsert' webhook payload'ından sender ve metni güvenle çıkar.
    Hem dict hem list yapısını destekler.
    Döndürür: (sender_jid, text) veya (None, None)
    """
    try:
        if payload.get("event") != "messages.upsert":
            return None, None
        d = payload.get("data") or {}

        # messages alanı dict ya da list olabilir
        msg = d.get("messages")
        if isinstance(msg, list) and msg:
            msg = msg[0]
        if not isinstance(msg, dict):
            return None, None

        # Kendisinden gelen mesajları atla
        if (msg.get("key") or {}).get("fromMe"):
            return None, None

        sender = (msg.get("key") or {}).get("remoteJid")

        m = msg.get("message") or {}
        text = (
            m.get("conversation") or
            (m.get("extendedTextMessage") or {}).get("text") or
            (m.get("message") or {}).get("conversation")
        )

        if sender and text:
            return sender, text.strip()
    except Exception as e:
        logging.exception("extract_text error: %s", e)
    return None, None

def send_whatsapp(to: str, text: str):
    """WaSender API ile düz metin gönder."""
    # remoteJid '905xx@s.whatsapp.net' gelirse sadece numarayı bırak
    if "@s.whatsapp.net" in to:
        to = to.split("@")[0]

    url = "https://www.wasenderapi.com/api/send-message"
    headers = {
        "Authorization": f"Bearer {WASENDER_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"to": to, "text": text}
    r = requests.post(url, headers=headers, json=payload, timeout=20)
    r.raise_for_status()
    return r.json()

@app.post("/webhook")
def webhook():
    data = request.get_json(silent=True) or {}
    sender, text = extract_text(data)

    if not sender or not text:
        # 200 dönüyoruz ki WaSender tekrar denemesin
        logging.info("Webhook geldi ama sender/text yok ya da fromMe. Payload kısmi: %s", str(data)[:300])
        return jsonify({"ok": True})

    try:
        # İlk test: sabit cevap (Gemini kapalı)
        reply = f"Merhaba! Mesajını aldım: {text}"
        send_whatsapp(sender, reply)
        return jsonify({"ok": True})
    except Exception as e:
        logging.exception("Yanıt gönderirken hata: %s", e)
        return jsonify({"ok": False}), 500

# --- Sonradan açacağımız Gemini örneği ---
"""
import google.generativeai as genai
genai.configure(api_key=GEMINI_API_KEY)
def ask_gemini(user_text: str) -> str:
    model = genai.GenerativeModel("gemini-1.5-flash")
    resp = model.generate_content(user_text)
    return (resp.text or "").strip()
# webhook içinde:
# reply = ask_gemini(text)
"""

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port)
