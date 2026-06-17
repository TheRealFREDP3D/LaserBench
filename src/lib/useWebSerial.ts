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
  const pendingOkResolversRef = useRef<((value: void) => void)[]>([]);

  const addMessage = useCallback((type: 'sent' | 'received', text: string) => {
    setMessages((prev) => {
      const newMessages = [...prev, { type, text, timestamp: Date.now() }];
      return newMessages.slice(-500); // Keep last 500 messages
    });
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

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
              const trimmedLine = line.trim();
              addMessage('received', trimmedLine);
              
              // Match 'ok' responses — covers bare 'ok' and Marlin V1-style 'ok N3 P15 B3'
              if (trimmedLine.toLowerCase().startsWith('ok')) {
                const resolver = pendingOkResolversRef.current.shift();
                if (resolver) {
                  resolver();
                }
              }
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
    if (!('serial' in navigator)) {
      addMessage('received', 'Error: Web Serial API is not supported in this browser.');
      return;
    }
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
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
      }
      if (writerRef.current) {
        await writerRef.current.close();
      }
      // Small delay to allow the read loop to terminate and release the lock
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      portRef.current = null;
      setIsConnected(false);
      addMessage('sent', '--- Disconnected ---');
    }
  };

  const send = async (command: string, silent = false): Promise<void> => {
    if (!writerRef.current || !isConnected) {
      throw new Error('Not connected to printer');
    }
    await writerRef.current.write(command + '\n');
    if (!silent) {
      addMessage('sent', command);
    }
  };

  const printGCode = async (gcode: string) => {
    if (!isConnected || isPrinting) return;

    setIsPrinting(true);
    setProgress(0);
    try {
      const lines = gcode
        .split('\n')
        .map(line => {
          // Strip inline comments (everything from ; onwards), then trim whitespace
          const stripped = line.split(';')[0].trim();
          return stripped;
        })
        .filter(line => {
          if (line.length === 0) return false;
          // M30 (program end) is not supported by Marlin V1 / Sprinter mashup — skip it
          if (line.toUpperCase().startsWith('M30')) return false;
          return true;
        });
      const totalLines = lines.length;

      for (let i = 0; i < totalLines; i++) {
        if (!keepReadingRef.current) break; // If disconnected during print

        const line = lines[i];
        
        // Register response handler BEFORE sending to eliminate race condition
        await new Promise<void>((resolve, reject) => {
          let timeoutId: any;
          
          const resolver = () => {
            clearTimeout(timeoutId);
            resolve();
          };
          
          // Add resolver to queue before sending
          pendingOkResolversRef.current.push(resolver);
          
          // Send the line
          send(line).catch(reject);
          
          // Timeout as fallback — 2s is plenty for a local USB serial link
          timeoutId = setTimeout(() => {
            // Remove resolver from queue if timeout occurs
            const index = pendingOkResolversRef.current.indexOf(resolver);
            if (index > -1) {
              pendingOkResolversRef.current.splice(index, 1);
            }
            resolve();
          }, 2000);
        });

        setProgress(Math.round(((i + 1) / totalLines) * 100));
      }
      addMessage('sent', '--- Print Job Finished ---');
    } catch (error) {
      console.error('Printing failed:', error);
      addMessage('received', 'Print error: ' + (error as Error).message);
    } finally {
      setIsPrinting(false);
      // Clear any pending resolvers on error/abort
      pendingOkResolversRef.current = [];
    }
  };

  return { isConnected, messages, isPrinting, progress, connect, disconnect, send, printGCode, clearMessages };
}
