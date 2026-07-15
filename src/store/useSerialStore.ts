import { create } from 'zustand';
import { SerialMessage } from '../types';

// ─── Public store interface ───────────────────────────────────────────────────

export interface SerialState {
  isConnected: boolean;
  connectionState: 'connected' | 'offline' | 'connecting';
  messages: SerialMessage[];
  isPrinting: boolean;
  progress: number;
  activePathIndex: number;
  currentPos: { x: number; y: number; z: number };
  movementMode: 'G90' | 'G91';
  connect: (baudRate?: number) => Promise<void>;
  disconnect: () => Promise<void>;
  send: (command: string, silent?: boolean, skipFlowControl?: boolean) => Promise<void>;
  printGCode: (gcode: string) => Promise<void>;
  abortPrint: () => void;
  clearMessages: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUFFER_SIZE = 8;
const MIN_SEND_INTERVAL_MS = 10;
const SLOT_TIMEOUT_MS = 10_000;
const MAX_MESSAGES = 500;

// ─── SerialConnection class ───────────────────────────────────────────────────
//
// Owns ALL mutable serial I/O state.  By instantiating it *inside* the Zustand
// factory closure (not at module level), each `create()` call gets its own
// independent instance.  This means:
//
//   • HMR: the old module is replaced entirely — no stale port handle leaks.
//   • Tests: each test can call `create()` to get a completely fresh store +
//     connection object with no shared state between test cases.
//   • There is zero module-level mutable state in this file.
//
class SerialConnection {
  // Hardware handles
  port: SerialPort | null = null;
  reader: ReadableStreamDefaultReader<string> | null = null;
  writer: WritableStreamDefaultWriter<string> | null = null;

  // Control flags
  keepReading = true;
  abortingPrint = false;
  printing = false;

  // Flow-control buffer (slot-based, mirrors GRBL's rx buffer model)
  bufferSlots = BUFFER_SIZE;
  bufferResolves: (() => void)[] = [];
  bufferTimeouts: ReturnType<typeof setTimeout>[] = [];

  // Rate-limiting for manual commands
  lastSendTime = 0;

  // Message list kept here so clearMessages can wipe both the Zustand state
  // and the internal copy atomically.
  messages: SerialMessage[] = [];

  // Callback set by the store so the class can push Zustand state updates
  // without importing the store (avoids circular references).
  private setState!: (partial: Partial<SerialState>) => void;

  /** Call once after construction to wire up the Zustand setter. */
  bind(setState: (partial: Partial<SerialState>) => void) {
    this.setState = setState;
  }

  // ── Flow control ────────────────────────────────────────────────────────────

  private clearPendingTimeouts() {
    for (const t of this.bufferTimeouts) clearTimeout(t);
    this.bufferTimeouts = [];
  }

  releaseSlot() {
    const resolve = this.bufferResolves.shift();
    const timer = this.bufferTimeouts.shift();
    if (timer) clearTimeout(timer);
    if (resolve) {
      resolve();
    } else if (this.bufferResolves.length === 0) {
      this.bufferSlots++;
    }
  }

  waitForSlot(): Promise<void> {
    if (this.bufferSlots > 0) {
      this.bufferSlots--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.bufferResolves.push(resolve);
      const timer = setTimeout(() => {
        const idx = this.bufferResolves.indexOf(resolve);
        if (idx !== -1) this.bufferResolves.splice(idx, 1);
        const tIdx = this.bufferTimeouts.indexOf(timer);
        if (tIdx !== -1) this.bufferTimeouts.splice(tIdx, 1);
        reject(new Error('Timed out waiting for printer response'));
      }, SLOT_TIMEOUT_MS);
      this.bufferTimeouts.push(timer);
    });
  }

  resetFlowControl() {
    this.clearPendingTimeouts();
    this.bufferSlots = BUFFER_SIZE;
    // Resolve all pending waiters so they unblock immediately
    for (const resolve of this.bufferResolves) resolve();
    this.bufferResolves = [];
  }

  // ── Messaging ───────────────────────────────────────────────────────────────

  pushMessage(type: 'sent' | 'received', text: string) {
    const msg: SerialMessage = { type, text, timestamp: Date.now() };
    const prev = this.messages;
    this.messages = prev.length >= MAX_MESSAGES ? [...prev.slice(1), msg] : [...prev, msg];
    this.setState({ messages: this.messages });
  }

  // ── Read loop ───────────────────────────────────────────────────────────────

  async startReadLoop() {
    const port = this.port;
    if (!port?.readable) return;

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable).catch(() => {});
    this.reader = textDecoder.readable.getReader();

    let lineBuffer = '';
    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split(/\r?\n/);
          lineBuffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            this.pushMessage('received', trimmed);

            if (trimmed.toLowerCase().startsWith('ok')) {
              this.releaseSlot();
            } else if (
              this.printing &&
              (trimmed.toLowerCase().startsWith('error') ||
                trimmed.toLowerCase().includes('echo:unknown command') ||
                trimmed.toLowerCase().includes('echo:error'))
            ) {
              this.pushMessage('received', `Firmware rejected command: ${trimmed}`);
              this.abortingPrint = true;
              this.resetFlowControl();
            }
          }
        }
      }
    } catch (error) {
      console.error('Serial read error:', error);
      this.keepReading = false;
      this.printing = false;
      this.setState({
        isConnected: false,
        connectionState: 'offline',
        isPrinting: false,
      });
      this.pushMessage('received', 'Connection lost: ' + (error as Error).message);
      this.resetFlowControl();
    } finally {
      await readableStreamClosed;
      this.reader?.releaseLock();
    }
  }
}

// ─── Store factory ────────────────────────────────────────────────────────────
//
// `conn` is instantiated INSIDE the factory closure — it is NOT a module-level
// variable.  Every call to `create()` produces a new SerialConnection, so HMR
// and test isolation both work correctly.
//

export const useSerialStore = create<SerialState>()((set, get) => {
  // Each store instance owns exactly one SerialConnection.
  const conn = new SerialConnection();
  conn.bind((partial) => set(partial as SerialState));

  return {
    // ── Initial state ──────────────────────────────────────────────────────
    isConnected: false,
    connectionState: 'offline' as const,
    messages: [],
    isPrinting: false,
    progress: 0,
    activePathIndex: -1,
    currentPos: { x: 0, y: 0, z: 0 },
    movementMode: 'G90' as const,

    // ── connect ────────────────────────────────────────────────────────────
    connect: async (baudRate?: number) => {
      if (!('serial' in navigator)) {
        conn.pushMessage('received', 'Error: Web Serial API is not supported in this browser.');
        return;
      }
      const resolvedBaud = Math.floor(Number(baudRate || 250000)) || 250000;
      try {
        set({ connectionState: 'connecting' });
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: resolvedBaud });
        conn.port = port;
        set({ connectionState: 'connected' });

        const encoder = new TextEncoderStream();
        if (port.writable) {
          encoder.readable.pipeTo(port.writable).catch(() => {});
        }
        conn.writer = encoder.writable.getWriter();

        set({ isConnected: true, movementMode: 'G90' });
        conn.keepReading = true;
        conn.startReadLoop();
        conn.pushMessage('sent', '--- Connected to printer ---');
      } catch (error) {
        console.error('Failed to connect:', error);
        if (conn.port) {
          try {
            await conn.port.close();
          } catch {
            /* ignore */
          }
          conn.port = null;
        }
        conn.pushMessage('received', 'Error: ' + (error as Error).message);
        set({ connectionState: 'offline' });
      }
    },

    // ── disconnect ─────────────────────────────────────────────────────────
    disconnect: async () => {
      conn.keepReading = false;
      try {
        if (conn.reader) await conn.reader.cancel();
        if (conn.writer) await conn.writer.close();
        // Small delay to let the read loop exit cleanly before closing port
        await new Promise((r) => setTimeout(r, 50));
        if (conn.port) await conn.port.close();
      } catch (error) {
        console.error('Error during disconnect:', error);
      } finally {
        conn.port = null;
        set({ isConnected: false, connectionState: 'offline' });
        conn.resetFlowControl();
        conn.pushMessage('sent', '--- Disconnected ---');
      }
    },

    // ── send ───────────────────────────────────────────────────────────────
    send: async (command: string, silent = false, skipFlowControl = false) => {
      if (!conn.writer || !get().isConnected) {
        throw new Error('Not connected to printer');
      }
      if (!silent) {
        const now = Date.now();
        const elapsed = now - conn.lastSendTime;
        if (elapsed < MIN_SEND_INTERVAL_MS) {
          await new Promise((r) => setTimeout(r, MIN_SEND_INTERVAL_MS - elapsed));
        }
        conn.lastSendTime = Date.now();
      }
      if (!skipFlowControl) {
        await conn.waitForSlot();
      }
      await conn.writer.write(command + '\n');
      const upper = command.toUpperCase();
      if (/\bG90\b/.test(upper)) set({ movementMode: 'G90' });
      if (/\bG91\b/.test(upper)) set({ movementMode: 'G91' });
      if (!silent) {
        conn.pushMessage('sent', command);
      }
    },

    // ── abortPrint ─────────────────────────────────────────────────────────
    abortPrint: () => {
      if (!get().isPrinting) return;
      conn.abortingPrint = true;
      conn.resetFlowControl();
      conn.pushMessage('sent', '--- Print Aborted by User ---');
    },

    // ── printGCode ─────────────────────────────────────────────────────────
    printGCode: async (gcode: string) => {
      if (!get().isConnected || get().isPrinting) return;

      set({ isPrinting: true, progress: 0 });
      conn.printing = true;
      conn.bufferSlots = BUFFER_SIZE;
      conn.bufferResolves = [];

      try {
        const lines = gcode
          .split('\n')
          .map((line) => line.split(';')[0].trim())
          .filter((line) => line.length > 0 && !line.toUpperCase().startsWith('M30'));
        const totalLines = lines.length;

        conn.abortingPrint = false;

        // Track how many lines we have actually sent but not yet acknowledged
        // so the drain phase waits for exactly that many 'ok' responses.
        let unacknowledged = 0;

        let pathCounter = -1;
        for (let i = 0; i < totalLines; i++) {
          const line = lines[i].toUpperCase();
          // Each G0 (except the initial setup moves) typically corresponds to a new PathSegment starting
          if (line.startsWith('G0') && !line.includes('Z')) {
            pathCounter++;
            set({ activePathIndex: pathCounter });
          }
          if (!conn.keepReading || conn.abortingPrint) break;

          try {
            await conn.waitForSlot();
          } catch (e) {
            if (e instanceof Error && e.message.includes('Timed out')) {
              conn.pushMessage('received', 'Printer not responding — aborting print.');
              conn.abortingPrint = true;
              break;
            }
            throw e;
          }

          if (!conn.keepReading || conn.abortingPrint) break;

          // Re-read send from the store so it picks up the current writer ref
          await get().send(lines[i], true, true);
          unacknowledged++;
          set({ progress: Math.round(((i + 1) / totalLines) * 100) });
        }

        // Drain: wait for exactly the number of outstanding 'ok' responses
        // rather than computing from buffer slot state, which can be racy.
        for (let drained = 0; drained < unacknowledged && !conn.abortingPrint; drained++) {
          await Promise.race([
            new Promise<void>((r) => conn.bufferResolves.push(r)),
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout waiting for final slots')), 30_000)
            ),
          ]);
        }

        if (!conn.abortingPrint) {
          conn.pushMessage('sent', '--- Print Job Finished ---');
        }
      } catch (error) {
        console.error('Printing failed:', error);
        conn.pushMessage('received', 'Print error: ' + (error as Error).message);
      } finally {
        conn.resetFlowControl();
        set({ isPrinting: false, activePathIndex: -1 });
        conn.printing = false;
        conn.abortingPrint = false;
      }
    },

    // ── clearMessages ──────────────────────────────────────────────────────
    clearMessages: () => {
      conn.messages = [];
      set({ messages: [] });
    },
  };
});
