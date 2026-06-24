import { useState, useRef, useCallback } from 'react';

export interface SerialMessage {
  type: 'sent' | 'received';
  text: string;
  timestamp: number;
}

const BUFFER_SIZE = 4;
const MIN_SEND_INTERVAL_MS = 50;

export function useWebSerial() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'offline' | 'connecting'>(
    'offline'
  );
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState(0);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const keepReadingRef = useRef(true);
  const abortPrintRef = useRef(false);
  const bufferSlotsRef = useRef(BUFFER_SIZE);
  const bufferResolveRef = useRef<(() => void)[]>([]);
  const lastSendTimeRef = useRef(0);

  const addMessage = useCallback((type: 'sent' | 'received', text: string) => {
    setMessages((prev) => {
      const newMessages = [...prev, { type, text, timestamp: Date.now() }];
      return newMessages.slice(-500);
    });
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  const waitForSlot = (): Promise<void> => {
    if (bufferSlotsRef.current > 0) {
      bufferSlotsRef.current--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      bufferResolveRef.current.push(resolve);
    });
  };

  const releaseSlot = () => {
    const resolve = bufferResolveRef.current.shift();
    if (resolve) {
      resolve();
    } else {
      bufferSlotsRef.current++;
    }
  };

  const readLoop = async () => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = portRef.current.readable
      .pipeTo(textDecoder.writable)
      .catch(() => {});
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
      bufferSlotsRef.current = BUFFER_SIZE;
      for (const resolve of bufferResolveRef.current) resolve();
      bufferResolveRef.current = [];
    } finally {
      await readableStreamClosed;
      readerRef.current.releaseLock();
    }
  };

  const connect = async (baudRate: number = 250000) => {
    if (!('serial' in navigator)) {
      addMessage('received', 'Error: Web Serial API is not supported in this browser.');
      return;
    }
    try {
      setConnectionState('connecting');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      setConnectionState('connected');

      const encoder = new TextEncoderStream();
      encoder.readable.pipeTo(port.writable).catch(() => {});
      writerRef.current = encoder.writable.getWriter();

      setIsConnected(true);
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
        await waitForSlot();
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
    connect,
    disconnect,
    send,
    printGCode,
    abortPrint,
    clearMessages,
  };
}
