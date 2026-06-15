import { useState, useRef, useCallback } from 'react';

export interface SerialMessage {
  type: 'sent' | 'received';
  text: string;
  timestamp: number;
}

export function useWebSerial() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState(0);

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const writerRef = useRef<any>(null);
  const keepReadingRef = useRef(true);

  const addMessage = useCallback((type: 'sent' | 'received', text: string) => {
    setMessages((prev) => {
      const newMessages = [...prev, { type, text, timestamp: Date.now() }];
      return newMessages.slice(-500); // Keep last 500 messages
    });
  }, []);

  const readLoop = async () => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = portRef.current.readable.pipeTo(textDecoder.writable);
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
              addMessage('received', line.trim());
              // Dispatch event for printer response handling (like 'ok' for streaming)
              window.dispatchEvent(new CustomEvent('printer-response', { detail: line.trim() }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Read error:', error);
    } finally {
      readerRef.current.releaseLock();
    }
  };

  const connect = async (baudRate: number = 250000) => {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;

      const encoder = new TextEncoderStream();
      encoder.readable.pipeTo(port.writable);
      writerRef.current = encoder.writable.getWriter();

      setIsConnected(true);
      keepReadingRef.current = true;
      readLoop();
      addMessage('sent', '--- Connected to printer ---');
    } catch (error) {
      console.error('Failed to connect:', error);
      addMessage('received', 'Error: ' + (error as Error).message);
    }
  };

  const disconnect = async () => {
    keepReadingRef.current = false;
    if (readerRef.current) {
      await readerRef.current.cancel();
    }
    if (writerRef.current) {
      await writerRef.current.close();
    }
    if (portRef.current) {
      await portRef.current.close();
    }
    portRef.current = null;
    setIsConnected(false);
    addMessage('sent', '--- Disconnected ---');
  };

  const send = async (command: string, silent = false) => {
    if (writerRef.current && isConnected) {
      await writerRef.current.write(command + '\n');
      if (!silent) {
        addMessage('sent', command);
      }
    }
  };

  const printGCode = async (gcode: string) => {
    if (!isConnected || isPrinting) return;

    setIsPrinting(true);
    setProgress(0);
    const lines = gcode.split('\n').filter(line => line.trim() && !line.startsWith(';'));
    const totalLines = lines.length;

    for (let i = 0; i < totalLines; i++) {
      if (!keepReadingRef.current) break; // If disconnected during print

      const line = lines[i];
      await send(line);

      // Simple flow control: wait for 'ok' from printer
      // Note: In a real implementation, we might want a more robust queue
      await new Promise<void>((resolve) => {
        const handler = (e: any) => {
          if (e.detail.toLowerCase().includes('ok')) {
            window.removeEventListener('printer-response', handler);
            resolve();
          }
        };
        window.addEventListener('printer-response', handler);
        // Timeout as fallback
        setTimeout(() => {
          window.removeEventListener('printer-response', handler);
          resolve();
        }, 5000);
      });

      setProgress(Math.round(((i + 1) / totalLines) * 100));
    }

    setIsPrinting(false);
    addMessage('sent', '--- Print Job Finished ---');
  };

  return { isConnected, messages, isPrinting, progress, connect, disconnect, send, printGCode, clearMessages: () => setMessages([]) };
}
