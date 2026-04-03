import type { AISMessage } from './types';

type MessageHandler = (msg: AISMessage) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void;

export class AISStreamManager {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private onMessage: MessageHandler;
  private onStatus: StatusHandler;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(config: {
    apiKey: string;
    knownMmsis: number[];
    onMessage: MessageHandler;
    onStatus: StatusHandler;
  }) {
    this.apiKey = config.apiKey;
    this.onMessage = config.onMessage;
    this.onStatus = config.onStatus;
  }

  connect(): void {
    if (this.destroyed) return;

    try {
      // Direct client-side WebSocket to aisstream.io
      this.ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

      this.ws.onopen = () => {
        console.log('[AIS] WebSocket connected to aisstream.io');
        this.reconnectAttempts = 0;
        this.onStatus('connected');

        this.ws!.send(JSON.stringify({
          APIKey: this.apiKey,
          BoundingBoxes: [[[32.0, -118.5], [33.5, -117.0]]],
          FilterMessageTypes: ['PositionReport'],
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(
            typeof event.data === 'string' ? event.data : ''
          ) as AISMessage;
          if (data.Message?.PositionReport) {
            this.onMessage(data);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        console.log('[AIS] WebSocket closed');
        if (!this.destroyed) {
          this.onStatus('reconnecting');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        console.error('[AIS] WebSocket error');
        this.onStatus('error');
        this.ws?.close();
      };
    } catch {
      this.onStatus('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    console.log(`[AIS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.onStatus('disconnected');
  }
}
