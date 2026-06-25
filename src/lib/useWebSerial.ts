import { useState, useRef, useCallback } from 'react';

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

export function useWebSerial() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'offline' | 'connecting'>(
    'offline'
  );
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [movementMode, setMovementMode] = useState<'G90' | 'G91'>('G90');

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const keepReadingRef = useRef(true);
  const abortPrintRef = useRef(false);
  const bufferSlotsRef = useRef(BUFFER_SIZE);
  const bufferResolveRef = useRef<(() => void)[]>([]);
  const bufferTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastSendTimeRef = useRef(0);

  const ringBufferRef = useRef(new RingBuffer<SerialMessage>(MAX_MESSAGES));

  const addMessage = useCallback((type: 'sent' | 'received', text: string) => {
    ringBufferRef.current.push({ type, text, timestamp: Date.now() });
    setMessages(ringBufferRef.current.toArray());
  }, []);

  const clearMessages = useCallback(() => {
    ringBufferRef.current.clear();
    setMessages([]);
  }, []);

  const waitForSlot = (): Promise<void> => {
    if (bufferSlotsRef.current > 0) {
      bufferSlotsRef.current--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const idx = bufferResolveRef.current.length;
      bufferResolveRef.current.push(resolve);
      const timer = setTimeout(() => {
        bufferResolveRef.current.splice(idx, 1);
        bufferTimeoutRef.current.splice(bufferTimeoutRef.current.indexOf(timer), 1);
        reject(new Error('Timed out waiting for printer response'));
      }, SLOT_TIMEOUT_MS);
      bufferTimeoutRef.current.push(timer);
    });
  };

  const clearPendingTimeouts = () => {
    for (const t of bufferTimeoutRef.current) clearTimeout(t);
    bufferTimeoutRef.current = [];
  };

  const releaseSlot = () => {
    const resolve = bufferResolveRef.current.shift();
    const timer = bufferTimeoutRef.current.shift();
    if (timer) clearTimeout(timer);
    if (resolve) {
      resolve();
    } else {
      bufferSlotsRef.current++;
    }
  };

  const readLoop = async () => {
    const port = portRef.current;
    if (!port?.readable) return;
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable).catch(() => {});
    readerRef.current = textDecoder.readable.getReader();

    let buffer = '';
    try {
      while (keepReadingRef.current) {
        const { value, done } = await readerRef.current.read();
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
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Read error:', error);
      keepReadingRef.current = false;
      setIsConnected(false);
      setConnectionState('offline');
      setIsPrinting(false);
      addMessage('received', 'Connection lost: ' + (error as Error).message);
      clearPendingTimeouts();
      bufferSlotsRef.current = BUFFER_SIZE;
      for (const resolve of bufferResolveRef.current) resolve();
      bufferResolveRef.current = [];
    } finally {
      await readableStreamClosed;
      readerRef.current.releaseLock();
    }
  };

  const connect = async (baudRate?: number) => {
    if (!('serial' in navigator)) {
      addMessage('received', 'Error: Web Serial API is not supported in this browser.');
      return;
    }
    const resolvedBaud = Math.floor(Number(baudRate || 250000)) || 250000;
    try {
      setConnectionState('connecting');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: resolvedBaud });
      portRef.current = port;
      setConnectionState('connected');

      const encoder = new TextEncoderStream();
      if (port.writable) {
        encoder.readable.pipeTo(port.writable).catch(() => {});
      }
      writerRef.current = encoder.writable.getWriter();

      setIsConnected(true);
      setMovementMode('G90');
      keepReadingRef.current = true;
      readLoop();
      addMessage('sent', '--- Connected to printer ---');
    } catch (error) {
      console.error('Failed to connect:', error);
      addMessage('received', 'Error: ' + (error as Error).message);
      setConnectionState('offline');
    }
  };

  const disconnect = async () => {
    keepReadingRef.current = false;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
      }
      if (writerRef.current) {
        await writerRef.current.close();
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      portRef.current = null;
      setIsConnected(false);
      setConnectionState('offline');
      clearPendingTimeouts();
      bufferSlotsRef.current = BUFFER_SIZE;
      bufferResolveRef.current = [];
      addMessage('sent', '--- Disconnected ---');
    }
  };

  const send = async (command: string, silent = false): Promise<void> => {
    if (!writerRef.current || !isConnected) {
      throw new Error('Not connected to printer');
    }
    if (!silent) {
      const now = Date.now();
      const elapsed = now - lastSendTimeRef.current;
      if (elapsed < MIN_SEND_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, MIN_SEND_INTERVAL_MS - elapsed));
      }
      lastSendTimeRef.current = Date.now();
      await waitForSlot();
    }
    await writerRef.current.write(command + '\n');
    const upper = command.toUpperCase();
    if (/\bG90\b/.test(upper)) setMovementMode('G90');
    if (/\bG91\b/.test(upper)) setMovementMode('G91');
    if (!silent) {
      addMessage('sent', command);
    }
  };

  const abortPrint = useCallback(() => {
    if (!isPrinting) return;
    abortPrintRef.current = true;
    while (bufferResolveRef.current.length > 0) {
      const resolve = bufferResolveRef.current.shift();
      if (resolve) resolve();
    }
    addMessage('sent', '--- Print Aborted by User ---');
  }, [isPrinting, addMessage]);

  const printGCode = async (gcode: string) => {
    if (!isConnected || isPrinting) return;

    setIsPrinting(true);
    setProgress(0);
    bufferSlotsRef.current = BUFFER_SIZE;
    bufferResolveRef.current = [];
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

      abortPrintRef.current = false;

      for (let i = 0; i < totalLines; i++) {
        if (!keepReadingRef.current || abortPrintRef.current) break;

        const line = lines[i];
        try {
          await waitForSlot();
        } catch (e) {
          if (e instanceof Error && e.message.includes('Timed out')) {
            addMessage('received', 'Printer not responding — aborting print.');
            abortPrintRef.current = true;
            break;
          }
          throw e;
        }
        if (!keepReadingRef.current || abortPrintRef.current) break;
        await send(line);

        setProgress(Math.round(((i + 1) / totalLines) * 100));
      }

      // Drain: wait for all in-flight commands to be acknowledged
      let slotsReleased = 0;
      const slotsNeeded = BUFFER_SIZE - bufferSlotsRef.current;
      while (slotsReleased < slotsNeeded && !abortPrintRef.current) {
        await new Promise<void>((r) => bufferResolveRef.current.push(r));
        slotsReleased++;
      }

      if (!abortPrintRef.current) {
        addMessage('sent', '--- Print Job Finished ---');
      }
    } catch (error) {
      console.error('Printing failed:', error);
      addMessage('received', 'Print error: ' + (error as Error).message);
    } finally {
      clearPendingTimeouts();
      setIsPrinting(false);
      abortPrintRef.current = false;
      bufferSlotsRef.current = BUFFER_SIZE;
      bufferResolveRef.current = [];
    }
  };

  return {
    isConnected,
    connectionState,
    messages,
    isPrinting,
    progress,
    movementMode,
    connect,
    disconnect,
    send,
    printGCode,
    abortPrint,
    clearMessages,
  };
}
