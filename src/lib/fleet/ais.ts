import type { AISMessage } from './types';

type MessageHandler = (msg: AISMessage) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void;

interface PositionData {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  heading: number;
  timestamp: number;
}

interface PositionResponse {
  connected: boolean;
  count: number;
  positions: PositionData[];
  error?: string;
}

export class AISStreamManager {
  private onMessage: MessageHandler;
  private onStatus: StatusHandler;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(config: {
    apiKey: string;
    knownMmsis: number[];
    onMessage: MessageHandler;
    onStatus: StatusHandler;
  }) {
    this.onMessage = config.onMessage;
    this.onStatus = config.onStatus;
  }

  connect(): void {
    if (this.destroyed) return;
    // Poll server endpoint every 15 seconds
    // Each server request opens a fresh WebSocket to aisstream.io for ~5 seconds
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), 15000);
  }

  private async poll(): Promise<void> {
    if (this.destroyed) return;

    try {
      const res = await fetch('/api/fleet/positions');
      if (!res.ok) {
        this.onStatus('error');
        return;
      }

      const data: PositionResponse = await res.json();
      this.onStatus(data.connected ? 'connected' : 'reconnecting');

      for (const pos of data.positions) {
        const msg: AISMessage = {
          MessageType: 'PositionReport',
          MetaData: {
            MMSI: pos.mmsi,
            ShipName: pos.name,
            latitude: pos.lat,
            longitude: pos.lng,
            time_utc: new Date(pos.timestamp).toISOString(),
          },
          Message: {
            PositionReport: {
              UserID: pos.mmsi,
              Latitude: pos.lat,
              Longitude: pos.lng,
              Sog: pos.sog * 10,
              Cog: pos.cog * 10,
              TrueHeading: pos.heading,
              Timestamp: Math.floor(pos.timestamp / 1000) % 60,
            },
          },
        };
        this.onMessage(msg);
      }

      if (data.count > 0) {
        console.log(`[AIS] Polled ${data.count} vessels`);
      }
    } catch {
      this.onStatus('error');
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.onStatus('disconnected');
  }
}
