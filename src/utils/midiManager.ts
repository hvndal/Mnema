/**
 * Web MIDI Output Manager
 * Manages MIDI permissions, device discovery, note triggers and CC messages.
 */

export interface MidiPortInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

export class WebMidiManager {
  private midiAccess: any | null = null;
  private selectedOutput: any | null = null;
  private activeNotes: Set<number> = new Set();
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }

  public async requestAccess(): Promise<{ success: boolean; ports: MidiPortInfo[]; error?: string }> {
    if (!this.isSupported) {
      return {
        success: false,
        ports: [],
        error: 'Web MIDI API is not supported in this browser. Please use Chrome, Edge, or Opera.',
      };
    }

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
      const ports = this.getAvailableOutputs();
      if (ports.length > 0) {
        this.selectOutput(ports[0].id);
      }
      return { success: true, ports };
    } catch (err: any) {
      return { success: false, ports: [], error: err.message || 'Permission denied for Web MIDI.' };
    }
  }

  public getAvailableOutputs(): MidiPortInfo[] {
    if (!this.midiAccess) return [];
    const ports: MidiPortInfo[] = [];
    const outputs = this.midiAccess.outputs.values();
    for (const output of outputs) {
      ports.push({
        id: output.id,
        name: output.name || `MIDI Port ${output.id}`,
        manufacturer: output.manufacturer || 'Generic',
        state: output.state || 'connected',
      });
    }
    return ports;
  }

  public selectOutput(portId: string) {
    if (!this.midiAccess) return;
    this.selectedOutput = this.midiAccess.outputs.get(portId) || null;
  }

  /**
   * Sends Note On (0x90)
   */
  public sendNoteOn(channel: number = 1, noteNumber: number, velocity: number = 100) {
    if (!this.selectedOutput) return;
    const status = 0x90 | ((channel - 1) & 0x0f);
    this.selectedOutput.send([status, noteNumber & 0x7f, velocity & 0x7f]);
    this.activeNotes.add(noteNumber);
  }

  /**
   * Sends Note Off (0x80)
   */
  public sendNoteOff(channel: number = 1, noteNumber: number) {
    if (!this.selectedOutput) return;
    const status = 0x80 | ((channel - 1) & 0x0f);
    this.selectedOutput.send([status, noteNumber & 0x7f, 0]);
    this.activeNotes.delete(noteNumber);
  }

  /**
   * Sends Control Change (0xB0)
   */
  public sendControlChange(channel: number = 1, controllerNumber: number, value: number) {
    if (!this.selectedOutput) return;
    const status = 0xb0 | ((channel - 1) & 0x0f);
    this.selectedOutput.send([status, controllerNumber & 0x7f, Math.round(value) & 0x7f]);
  }

  /**
   * Panic / Stop all active notes to prevent stuck sounds
   */
  public allNotesOff(channel: number = 1) {
    if (!this.selectedOutput) return;
    for (const note of this.activeNotes) {
      this.sendNoteOff(channel, note);
    }
    this.activeNotes.clear();
    // CC 123 (All Notes Off)
    this.sendControlChange(channel, 123, 0);
  }
}
