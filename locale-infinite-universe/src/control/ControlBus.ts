import type { ControlCommand, OutputStatus } from './ControlState';

const CHANNEL = 'locale-infinite-universe';

type Message = { kind: 'command'; command: ControlCommand } | { kind: 'status'; status: OutputStatus };

/**
 * Messaging between the LED output window and control panels. Uses
 * BroadcastChannel (same browser, any window / screen) plus in-page delivery
 * so the embedded panel on the output page shares the same code path.
 */
export class ControlBus {
  private readonly channel: BroadcastChannel | null;
  private readonly commandListeners = new Set<(c: ControlCommand) => void>();
  private readonly statusListeners = new Set<(s: OutputStatus) => void>();

  constructor() {
    this.channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
    this.channel?.addEventListener('message', (e: MessageEvent<Message>) => this.deliver(e.data));
  }

  send(command: ControlCommand): void {
    const message: Message = { kind: 'command', command };
    this.channel?.postMessage(message);
    this.deliver(message);
  }

  publish(status: OutputStatus): void {
    const message: Message = { kind: 'status', status };
    this.channel?.postMessage(message);
    this.deliver(message);
  }

  onCommand(listener: (c: ControlCommand) => void): void {
    this.commandListeners.add(listener);
  }

  onStatus(listener: (s: OutputStatus) => void): void {
    this.statusListeners.add(listener);
  }

  private deliver(message: Message): void {
    if (message.kind === 'command') for (const l of this.commandListeners) l(message.command);
    else for (const l of this.statusListeners) l(message.status);
  }
}
