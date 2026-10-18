export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

const STORAGE_KEY = 'locale-universe:log';
const MAX_ENTRIES = 80;

/**
 * Ring-buffer logger. Entries are mirrored to localStorage so a crash during
 * a long night can be inspected the next day from the control panel.
 */
class Logger {
  private entries: LogEntry[] = [];
  private listeners = new Set<(entry: LogEntry) => void>();

  constructor() {
    try {
      this.entries = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LogEntry[];
    } catch {
      this.entries = [];
    }
  }

  get recent(): readonly LogEntry[] {
    return this.entries;
  }

  info(message: string): void {
    this.push('info', message);
  }

  warn(message: string): void {
    this.push('warn', message);
  }

  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : '';
    this.push('error', message + detail);
  }

  onEntry(listener: (entry: LogEntry) => void): void {
    this.listeners.add(listener);
  }

  installGlobalHandlers(): void {
    window.addEventListener('error', (e) => this.error('Uncaught', e.error ?? e.message));
    window.addEventListener('unhandledrejection', (e) => this.error('Unhandled promise', e.reason));
  }

  private push(level: LogLevel, message: string): void {
    const entry: LogEntry = { time: new Date().toISOString(), level, message };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    (level === 'error' ? console.error : level === 'warn' ? console.warn : console.info)(`[locale] ${message}`);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // storage full or blocked: keep in memory only
    }
    for (const l of this.listeners) l(entry);
  }
}

export const log = new Logger();
