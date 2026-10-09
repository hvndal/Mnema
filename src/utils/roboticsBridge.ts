/**
 * WebSocket Robotics & Teleoperation Bridge Client
 * Formats standardized JSON velocity and actuator packets with neutral-state safety fallbacks.
 */

export interface TeleopPacket {
  type: 'teleop_cmd' | 'neutral_state' | 'emergency_stop';
  timestampMs: number;
  linearX: number; // -1.0 to 1.0 (Forward/Reverse)
  angularZ: number; // -1.0 to 1.0 (Turn rate)
  gripperState: boolean; // open/closed
  estopActive: boolean;
}

export class RoboticsWebSocketBridge {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private onStatusChange?: (connected: boolean, error?: string) => void;
  private onMessageLog?: (msg: string, isOutgoing: boolean) => void;

  constructor() {}

  public setCallbacks(
    onStatusChange?: (connected: boolean, error?: string) => void,
    onMessageLog?: (msg: string, isOutgoing: boolean) => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onMessageLog = onMessageLog;
  }

  public connect(url: string) {
    if (this.ws) {
      this.disconnect();
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.onStatusChange?.(true);
        this.logMessage(`Connected to robot bridge: ${url}`, false);
        // Transmit initial neutral handshake
        this.sendNeutralState();
      };

      this.ws.onmessage = (event) => {
        this.logMessage(`Incoming: ${event.data}`, false);
      };

      this.ws.onerror = (_err) => {
        this.logMessage(`WebSocket error occurred`, false);
        this.onStatusChange?.(false, 'Connection error');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onStatusChange?.(false);
        this.logMessage('Connection closed. Neutral state assumed.', false);
      };
    } catch (err: any) {
      this.onStatusChange?.(false, err.message);
    }
  }

  public disconnect() {
    if (this.ws) {
      // Send neutral state before disconnecting
      this.sendNeutralState();
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.onStatusChange?.(false);
    }
  }

  public sendTeleopPacket(linearX: number, angularZ: number, gripperState: boolean, estopActive: boolean) {
    const packet: TeleopPacket = {
      type: estopActive ? 'emergency_stop' : 'teleop_cmd',
      timestampMs: performance.now(),
      linearX: Math.round(linearX * 1000) / 1000,
      angularZ: Math.round(angularZ * 1000) / 1000,
      gripperState,
      estopActive,
    };
    this.sendJson(packet);
  }

  public sendNeutralState() {
    const packet: TeleopPacket = {
      type: 'neutral_state',
      timestampMs: performance.now(),
      linearX: 0,
      angularZ: 0,
      gripperState: false,
      estopActive: false,
    };
    this.sendJson(packet);
  }

  public sendEmergencyStop() {
    const packet: TeleopPacket = {
      type: 'emergency_stop',
      timestampMs: performance.now(),
      linearX: 0,
      angularZ: 0,
      gripperState: false,
      estopActive: true,
    };
    this.sendJson(packet);
  }

  private sendJson(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const str = JSON.stringify(data);
      this.ws.send(str);
      this.logMessage(str, true);
    }
  }

  private logMessage(msg: string, isOutgoing: boolean) {
    this.onMessageLog?.(msg, isOutgoing);
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}
