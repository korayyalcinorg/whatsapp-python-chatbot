import { ControlBus } from '../control/ControlBus';
import { ControlPanel } from '../control/ControlPanel';
import { log } from '../core/Logger';

type ScreenDetailed = Screen & { availLeft: number; availTop: number };
type ScreenDetails = { screens: ScreenDetailed[]; currentScreen: ScreenDetailed };

/**
 * Stand-alone DJ panel (control.html) for a second screen / laptop. Talks to
 * the LED output window through BroadcastChannel (same browser, same machine).
 */
export class ControlApp {
  constructor(container: HTMLElement) {
    const bus = new ControlBus();
    const panel = new ControlPanel(bus, 'standalone', () => void this.openOutput());
    container.append(panel.root);
  }

  /** Open the output on the other screen when the Window Management API allows it. */
  private async openOutput(): Promise<void> {
    let features = 'popup,width=1280,height=720';
    const w = window as Window & { getScreenDetails?: () => Promise<ScreenDetails> };
    if (w.getScreenDetails) {
      try {
        const details = await w.getScreenDetails();
        const other = details.screens.find((s) => s !== details.currentScreen) ?? details.currentScreen;
        features = `popup,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
      } catch (err) {
        log.warn(`Screen details unavailable: ${(err as Error).message}`);
      }
    }
    const url = new URL('./', window.location.href);
    url.searchParams.set('profile', 'led');
    const win = window.open(url.toString(), 'locale-led-output', features);
    if (!win) log.warn('Popup blocked: allow popups for this site, or open the output URL manually.');
  }
}
