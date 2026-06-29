import { create } from 'zustand';

export interface SerialMessage {
  type: 'sent' | 'received';
  text: string;
  timestamp: number;
}

const BUFFER_SIZE = 4;
const MIN_SEND_INTERVAL_MS = 50;
const SLOT_TIMEOUT_MS = 10_000;
const MAX_MESSAGES = 500;

class RingBuffer<T> {
  private buffer: T[];
  private head = 0;
  private count = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[(this.head + this.count) % this.capacity] = item;
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    if (this.count === 0) return [];
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }
}

let ringBuffer: RingBuffer<SerialMessage>;

let portRef: SerialPort | null = null;
let readerRef: ReadableStreamDefaultReader<string> | null = null;
let writerRef: WritableStreamDefaultWriter<string> | null = null;
let keepReadingRef = true;
let abortPrintRef = false;
let bufferSlotsRef = BUFFER_SIZE;
let bufferResolveRef: (() => void)[] = [];
let bufferTimeoutRef: ReturnType<typeof setTimeout>[] = [];
let lastSendTimeRef = 0;
let isPrintingRef = false;

interface SerialState {
  isConnected: boolean;
  connectionState: 'connected' | 'offline' | 'connecting';
  messages: SerialMessage[];
  isPrinting: boolean;
  progress: number;
  movementMode: 'G90' | 'G91';
  connect: (baudRate?: number) => Promise<void>;
  disconnect: () => Promise<void>;
  send: (command: string, silent?: boolean, skipFlowControl?: boolean) => Promise<void>;
  printGCode: (gcode: string) => Promise<void>;
  abortPrint: () => void;
  clearMessages: () => void;
}

let addMessage: (type: 'sent' | 'received', text: string) => void;

function clearPendingTimeouts() {
  for (const t of bufferTimeoutRef) clearTimeout(t);
  bufferTimeoutRef = [];
}

function releaseSlot() {
  const resolve = bufferResolveRef.shift();
  const timer = bufferTimeoutRef.shift();
  if (timer) clearTimeout(timer);
  if (resolve) {
    resolve();
  } else {
    bufferSlotsRef++;
  }
}

function waitForSlot(): Promise<void> {
  if (bufferSlotsRef > 0) {
    bufferSlotsRef--;
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    bufferResolveRef.push(resolve);
    const timer = setTimeout(() => {
      const idx = bufferResolveRef.indexOf(resolve);
      if (idx !== -1) bufferResolveRef.splice(idx, 1);
      bufferTimeoutRef.splice(bufferTimeoutRef.indexOf(timer), 1);
      reject(new Error('Timed out waiting for printer response'));
    }, SLOT_TIMEOUT_MS);
    bufferTimeoutRef.push(timer);
  });
}

async function readLoop() {
  const port = portRef;
  if (!port?.readable) return;
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = port.readable.pipeTo(textDecoder.writable).catch(() => {});
  readerRef = textDecoder.readable.getReader();

  let buffer = '';
  try {
    while (keepReadingRef) {
      const { value, done } = await readerRef.read();
      if (done) break;
      if (value) {
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            const trimmedLine = line.trim();
            addMessage('received', trimmedLine);

            if (trimmedLine.toLowerCase().startsWith('ok')) {
              releaseSlot();
            } else if (
              isPrintingRef &&
              (trimmedLine.toLowerCase().startsWith('error') ||
                trimmedLine.toLowerCase().includes('echo:unknown command') ||
                trimmedLine.toLowerCase().includes('echo:error'))
            ) {
              addMessage('received', `Firmware rejected command: ${trimmedLine}`);
              abortPrintRef = true;
              clearPendingTimeouts();
              for (const resolve of bufferResolveRef) resolve();
              bufferResolveRef = [];
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Read error:', error);
    keepReadingRef = false;
    useSerialStore.setState({
      isConnected: false,
      connectionState: 'offline',
      isPrinting: false,
    });
    isPrintingRef = false;
    addMessage('received', 'Connection lost: ' + (error as Error).message);
    clearPendingTimeouts();
    bufferSlotsRef = BUFFER_SIZE;
    for (const resolve of bufferResolveRef) resolve();
    bufferResolveRef = [];
  } finally {
    await readableStreamClosed;
    readerRef?.releaseLock();
  }
}

export const useSerialStore = create<SerialState>()((set, get) => {
  ringBuffer = new RingBuffer<SerialMessage>(MAX_MESSAGES);

  addMessage = (type, text) => {
    const msg: SerialMessage = { type, text, timestamp: Date.now() };
    ringBuffer.push(msg);
    const prev = get().messages;
    set({
      messages: prev.length >= MAX_MESSAGES ? [...prev.slice(1), msg] : [...prev, msg],
    });
  };

  return {
    isConnected: false,
    connectionState: 'offline' as const,
    messages: [],
    isPrinting: false,
    progress: 0,
    movementMode: 'G90' as const,

    connect: async (baudRate?: number) => {
      if (!('serial' in navigator)) {
        addMessage('received', 'Error: Web Serial API is not supported in this browser.');
        return;
      }
      const resolvedBaud = Math.floor(Number(baudRate || 250000)) || 250000;
      try {
        useSerialStore.setState({ connectionState: 'connecting' });
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: resolvedBaud });
        portRef = port;
        useSerialStore.setState({ connectionState: 'connected' });

        const encoder = new TextEncoderStream();
        if (port.writable) {
          encoder.readable.pipeTo(port.writable).catch(() => {});
        }
        writerRef = encoder.writable.getWriter();

        useSerialStore.setState({ isConnected: true, movementMode: 'G90' });
        keepReadingRef = true;
        readLoop();
        addMessage('sent', '--- Connected to printer ---');
      } catch (error) {
        console.error('Failed to connect:', error);
        addMessage('received', 'Error: ' + (error as Error).message);
        useSerialStore.setState({ connectionState: 'offline' });
      }
    },

    disconnect: async () => {
      keepReadingRef = false;
      try {
        if (readerRef) {
          await readerRef.cancel();
        }
        if (writerRef) {
          await writerRef.close();
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (portRef) {
          await portRef.close();
        }
      } catch (error) {
        console.error('Error during disconnect:', error);
      } finally {
        portRef = null;
        useSerialStore.setState({ isConnected: false, connectionState: 'offline' });
        clearPendingTimeouts();
        bufferSlotsRef = BUFFER_SIZE;
        bufferResolveRef = [];
        addMessage('sent', '--- Disconnected ---');
      }
    },

    send: async (command: string, silent = false, skipFlowControl = false) => {
      const { isConnected } = useSerialStore.getState();
      if (!writerRef || !isConnected) {
        throw new Error('Not connected to printer');
      }
      if (!silent) {
        const now = Date.now();
        const elapsed = now - lastSendTimeRef;
        if (elapsed < MIN_SEND_INTERVAL_MS) {
          await new Promise((r) => setTimeout(r, MIN_SEND_INTERVAL_MS - elapsed));
        }
        lastSendTimeRef = Date.now();
      }
      if (!skipFlowControl) {
        await waitForSlot();
      }
      await writerRef.write(command + '\n');
      const upper = command.toUpperCase();
      if (/\bG90\b/.test(upper)) useSerialStore.setState({ movementMode: 'G90' });
      if (/\bG91\b/.test(upper)) useSerialStore.setState({ movementMode: 'G91' });
      if (!silent) {
        addMessage('sent', command);
      }
    },

    abortPrint: () => {
      const { isPrinting } = useSerialStore.getState();
      if (!isPrinting) return;
      abortPrintRef = true;
      while (bufferResolveRef.length > 0) {
        const resolve = bufferResolveRef.shift();
        if (resolve) resolve();
      }
      addMessage('sent', '--- Print Aborted by User ---');
    },

    printGCode: async (gcode: string) => {
      const { isConnected, isPrinting } = useSerialStore.getState();
      if (!isConnected || isPrinting) return;

      useSerialStore.setState({ isPrinting: true, progress: 0 });
      isPrintingRef = true;
      bufferSlotsRef = BUFFER_SIZE;
      bufferResolveRef = [];
      try {
        const lines = gcode
          .split('\n')
          .map((line) => {
            const stripped = line.split(';')[0].trim();
            return stripped;
          })
          .filter((line) => {
            if (line.length === 0) return false;
            if (line.toUpperCase().startsWith('M30')) return false;
            return true;
          });
        const totalLines = lines.length;

        abortPrintRef = false;

        for (let i = 0; i < totalLines; i++) {
          if (!keepReadingRef || abortPrintRef) break;

          const line = lines[i];
          try {
            await waitForSlot();
          } catch (e) {
            if (e instanceof Error && e.message.includes('Timed out')) {
              addMessage('received', 'Printer not responding — aborting print.');
              abortPrintRef = true;
              break;
            }
            throw e;
          }
          if (!keepReadingRef || abortPrintRef) break;

          const { send } = useSerialStore.getState();
          await send(line, false, true);

          useSerialStore.setState({ progress: Math.round(((i + 1) / totalLines) * 100) });
        }

        let slotsReleased = 0;
        const slotsNeeded = BUFFER_SIZE - bufferSlotsRef;
        while (slotsReleased < slotsNeeded && !abortPrintRef) {
          await new Promise<void>((r) => bufferResolveRef.push(r));
          slotsReleased++;
        }

        if (!abortPrintRef) {
          addMessage('sent', '--- Print Job Finished ---');
        }
      } catch (error) {
        console.error('Printing failed:', error);
        addMessage('received', 'Print error: ' + (error as Error).message);
      } finally {
        clearPendingTimeouts();
        useSerialStore.setState({ isPrinting: false });
        isPrintingRef = false;
        abortPrintRef = false;
        bufferSlotsRef = BUFFER_SIZE;
        bufferResolveRef = [];
      }
    },

    clearMessages: () => {
      ringBuffer.clear();
      useSerialStore.setState({ messages: [] });
    },
  };
});
