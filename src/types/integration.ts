/**
 * Unified Controller Integration & Action Mapping Models
 * Version: 1.0-controller-integration-engine
 */

export type InputSourceType = 'button' | 'button_chord' | 'axis' | 'trigger';

export interface InputBindingSource {
  type: InputSourceType;
  buttonIndex?: number;
  buttonIndices?: number[]; // For chord combinations, e.g. [4, 5] (LB+RB)
  axisIndex?: number; // 0=LX, 1=LY, 2=RX, 3=RY
  axisDirection?: 'positive' | 'negative' | 'both'; // for threshold triggers or continuous
  activationThreshold?: number; // e.g. 0.5 for triggers / stick deflection
  deadzone?: number; // deadzone filtering for continuous axes
  debounceMs?: number; // debouncing window to prevent chattering
}

export type ActionCategory = 
  | 'midi'              // Web MIDI messages
  | 'media_slide'       // Presentation & Media controls
  | 'editing_timeline'  // Video & Timeline simulator actions
  | 'robotics_network'; // WebSocket teleoperation messages

export type ActionBehavior = 'one_shot' | 'continuous' | 'repeat_hold';

export interface ActionDefinition {
  id: string;
  name: string;
  category: ActionCategory;
  behavior: ActionBehavior;
  
  // Specific action parameters
  parameters: {
    // MIDI params
    midiType?: 'note_on_off' | 'cc' | 'pitch_bend';
    midiChannel?: number; // 1-16
    midiNote?: number; // 0-127
    midiVelocity?: number; // 0-127
    midiCcNumber?: number; // 0-127
    midiValueMin?: number; // 0-127
    midiValueMax?: number; // 0-127

    // Media / Presentation params
    mediaAction?: 'play_pause' | 'next_slide' | 'prev_slide' | 'volume_up' | 'volume_down' | 'mute';
    shortcutLabel?: string; // e.g. "Space", "ArrowRight", "Ctrl+Z"

    // Timeline Editing params
    editAction?: 'mark_in' | 'mark_out' | 'cut' | 'undo' | 'redo' | 'scrub_forward' | 'scrub_backward' | 'next_clip' | 'prev_clip';
    continuousParam?: string; // e.g. "playhead_scrub", "zoom_level"

    // Robotics params
    robotCommand?: 'drive' | 'turn' | 'arm_lift' | 'gripper' | 'emergency_stop';
    channelKey?: string; // e.g. "linear_x", "angular_z"
  };
}

export interface ControllerMappingEntry {
  id: string;
  label: string;
  enabled: boolean;
  input: InputBindingSource;
  action: ActionDefinition;
}

export interface IntegrationProfile {
  id: string;
  name: string;
  version: string;
  description: string;
  category: ActionCategory;
  outputDestination: {
    type: 'internal_sim' | 'web_midi' | 'websocket';
    targetName?: string;
    endpointUrl?: string; // WebSocket URL
    sendFrequencyHz?: number; // e.g. 20 Hz
  };
  requiredCapabilities: string[];
  compatibilityNotes: string;
  mappings: ControllerMappingEntry[];
}
