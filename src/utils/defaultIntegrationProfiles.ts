import type { IntegrationProfile } from '../types/integration';

export const DEFAULT_INTEGRATION_PROFILES: IntegrationProfile[] = [
  // -------------------------------------------------------------
  // PROFILE A: MUSIC & MIDI CONTROLLER
  // -------------------------------------------------------------
  {
    id: 'profile-midi-music',
    name: 'Music Producer & MIDI Controller',
    version: '1.0.0',
    description: 'Map face buttons to MIDI drum pads and analog stick/triggers to CC expression pedals.',
    category: 'midi',
    outputDestination: {
      type: 'web_midi',
      targetName: 'Default Web MIDI Output',
    },
    requiredCapabilities: ['Web MIDI API (navigator.requestMIDIAccess)'],
    compatibilityNotes: 'Requires a Web MIDI-compatible browser (Chrome, Edge, Opera) in a secure context. Controlling external DAWs (Ableton, FL Studio, Reaper) directly requires creating a virtual loopback MIDI port (loopMIDI on Windows).',
    mappings: [
      {
        id: 'midi-btn-a',
        label: 'A Button -> Kick Drum (Note 36 / C1)',
        enabled: true,
        input: { type: 'button', buttonIndex: 0, debounceMs: 25 },
        action: {
          id: 'act-note-36',
          name: 'Kick Drum (Note 36)',
          category: 'midi',
          behavior: 'one_shot',
          parameters: { midiType: 'note_on_off', midiChannel: 1, midiNote: 36, midiVelocity: 110 },
        },
      },
      {
        id: 'midi-btn-x',
        label: 'X Button -> Snare Drum (Note 38 / D1)',
        enabled: true,
        input: { type: 'button', buttonIndex: 2, debounceMs: 25 },
        action: {
          id: 'act-note-38',
          name: 'Snare Drum (Note 38)',
          category: 'midi',
          behavior: 'one_shot',
          parameters: { midiType: 'note_on_off', midiChannel: 1, midiNote: 38, midiVelocity: 105 },
        },
      },
      {
        id: 'midi-btn-y',
        label: 'Y Button -> Closed Hi-Hat (Note 42 / F#1)',
        enabled: true,
        input: { type: 'button', buttonIndex: 3, debounceMs: 25 },
        action: {
          id: 'act-note-42',
          name: 'Closed Hi-Hat (Note 42)',
          category: 'midi',
          behavior: 'one_shot',
          parameters: { midiType: 'note_on_off', midiChannel: 1, midiNote: 42, midiVelocity: 95 },
        },
      },
      {
        id: 'midi-btn-b',
        label: 'B Button -> Open Hi-Hat (Note 46 / A#1)',
        enabled: true,
        input: { type: 'button', buttonIndex: 1, debounceMs: 25 },
        action: {
          id: 'act-note-46',
          name: 'Open Hi-Hat (Note 46)',
          category: 'midi',
          behavior: 'one_shot',
          parameters: { midiType: 'note_on_off', midiChannel: 1, midiNote: 46, midiVelocity: 100 },
        },
      },
      {
        id: 'midi-rt-expression',
        label: 'Right Trigger (RT) -> Filter Cutoff (CC 1)',
        enabled: true,
        input: { type: 'trigger', buttonIndex: 7, deadzone: 0.05 },
        action: {
          id: 'act-cc-1',
          name: 'Filter Modulation (CC 1)',
          category: 'midi',
          behavior: 'continuous',
          parameters: { midiType: 'cc', midiChannel: 1, midiCcNumber: 1, midiValueMin: 0, midiValueMax: 127 },
        },
      },
      {
        id: 'midi-ly-pitch',
        label: 'Left Stick Y -> Pitch Modulation (CC 74)',
        enabled: true,
        input: { type: 'axis', axisIndex: 1, deadzone: 0.08, axisDirection: 'both' },
        action: {
          id: 'act-cc-74',
          name: 'Frequency Sweep (CC 74)',
          category: 'midi',
          behavior: 'continuous',
          parameters: { midiType: 'cc', midiChannel: 1, midiCcNumber: 74, midiValueMin: 0, midiValueMax: 127 },
        },
      },
    ],
  },

  // -------------------------------------------------------------
  // PROFILE B: MEDIA & PRESENTATION CONTROLLER
  // -------------------------------------------------------------
  {
    id: 'profile-media-presentation',
    name: 'Media & Presentation Clicker',
    version: '1.0.0',
    description: 'Use controller bumpers and D-Pad for seamless slide deck advancement and video media control.',
    category: 'media_slide',
    outputDestination: {
      type: 'internal_sim',
      targetName: 'In-App Presentation Simulator',
    },
    requiredCapabilities: ['Standard Browser DOM'],
    compatibilityNotes: 'Runs inside the browser demonstration simulator. Browsers cannot fire synthetic global OS-level keystrokes to background desktop PowerPoint/Keynote applications without a companion native bridge.',
    mappings: [
      {
        id: 'pres-next',
        label: 'Right Bumper (RB) -> Next Slide',
        enabled: true,
        input: { type: 'button', buttonIndex: 5, debounceMs: 150 },
        action: {
          id: 'act-next-slide',
          name: 'Next Slide',
          category: 'media_slide',
          behavior: 'one_shot',
          parameters: { mediaAction: 'next_slide', shortcutLabel: 'Right Arrow' },
        },
      },
      {
        id: 'pres-prev',
        label: 'Left Bumper (LB) -> Previous Slide',
        enabled: true,
        input: { type: 'button', buttonIndex: 4, debounceMs: 150 },
        action: {
          id: 'act-prev-slide',
          name: 'Previous Slide',
          category: 'media_slide',
          behavior: 'one_shot',
          parameters: { mediaAction: 'prev_slide', shortcutLabel: 'Left Arrow' },
        },
      },
      {
        id: 'pres-play-pause',
        label: 'A Button -> Play / Pause Media',
        enabled: true,
        input: { type: 'button', buttonIndex: 0, debounceMs: 150 },
        action: {
          id: 'act-play-pause',
          name: 'Play / Pause',
          category: 'media_slide',
          behavior: 'one_shot',
          parameters: { mediaAction: 'play_pause', shortcutLabel: 'Space' },
        },
      },
      {
        id: 'pres-vol-up',
        label: 'D-Pad Up -> Volume Up',
        enabled: true,
        input: { type: 'button', buttonIndex: 12, debounceMs: 100 },
        action: {
          id: 'act-vol-up',
          name: 'Volume Up',
          category: 'media_slide',
          behavior: 'repeat_hold',
          parameters: { mediaAction: 'volume_up', shortcutLabel: 'ArrowUp' },
        },
      },
      {
        id: 'pres-vol-down',
        label: 'D-Pad Down -> Volume Down',
        enabled: true,
        input: { type: 'button', buttonIndex: 13, debounceMs: 100 },
        action: {
          id: 'act-vol-down',
          name: 'Volume Down',
          category: 'media_slide',
          behavior: 'repeat_hold',
          parameters: { mediaAction: 'volume_down', shortcutLabel: 'ArrowDown' },
        },
      },
    ],
  },

  // -------------------------------------------------------------
  // PROFILE C: EDITING WORKFLOW CONTROLLER
  // -------------------------------------------------------------
  {
    id: 'profile-editing-workflow',
    name: 'NLE Video Timeline Controller',
    version: '1.0.0',
    description: 'Hardware shuttle wheel and edit keyboard shortcut mapper for rapid timeline cutting.',
    category: 'editing_timeline',
    outputDestination: {
      type: 'internal_sim',
      targetName: 'In-App Video Timeline Simulator',
    },
    requiredCapabilities: ['Standard Browser DOM'],
    compatibilityNotes: 'Designed for high-speed mark in/out, razor blade splitting, and analog stick shuttle wheel jogging inside the timeline simulator.',
    mappings: [
      {
        id: 'edit-mark-in',
        label: 'X Button -> Mark In Point (I)',
        enabled: true,
        input: { type: 'button', buttonIndex: 2, debounceMs: 100 },
        action: {
          id: 'act-mark-in',
          name: 'Mark In Point',
          category: 'editing_timeline',
          behavior: 'one_shot',
          parameters: { editAction: 'mark_in', shortcutLabel: 'I' },
        },
      },
      {
        id: 'edit-mark-out',
        label: 'B Button -> Mark Out Point (O)',
        enabled: true,
        input: { type: 'button', buttonIndex: 1, debounceMs: 100 },
        action: {
          id: 'act-mark-out',
          name: 'Mark Out Point',
          category: 'editing_timeline',
          behavior: 'one_shot',
          parameters: { editAction: 'mark_out', shortcutLabel: 'O' },
        },
      },
      {
        id: 'edit-cut',
        label: 'Y Button -> Razor Split at Playhead (C / Ctrl+K)',
        enabled: true,
        input: { type: 'button', buttonIndex: 3, debounceMs: 120 },
        action: {
          id: 'act-split',
          name: 'Razor Blade Cut',
          category: 'editing_timeline',
          behavior: 'one_shot',
          parameters: { editAction: 'cut', shortcutLabel: 'Ctrl+K' },
        },
      },
      {
        id: 'edit-undo',
        label: 'Left Bumper -> Undo (Ctrl+Z)',
        enabled: true,
        input: { type: 'button', buttonIndex: 4, debounceMs: 150 },
        action: {
          id: 'act-undo',
          name: 'Undo',
          category: 'editing_timeline',
          behavior: 'one_shot',
          parameters: { editAction: 'undo', shortcutLabel: 'Ctrl+Z' },
        },
      },
      {
        id: 'edit-redo',
        label: 'Right Bumper -> Redo (Ctrl+Y)',
        enabled: true,
        input: { type: 'button', buttonIndex: 5, debounceMs: 150 },
        action: {
          id: 'act-redo',
          name: 'Redo',
          category: 'editing_timeline',
          behavior: 'one_shot',
          parameters: { editAction: 'redo', shortcutLabel: 'Ctrl+Y' },
        },
      },
      {
        id: 'edit-jog-wheel',
        label: 'Right Stick X -> Shuttle / Jog Wheel',
        enabled: true,
        input: { type: 'axis', axisIndex: 2, deadzone: 0.1, axisDirection: 'both' },
        action: {
          id: 'act-jog',
          name: 'Timeline Playhead Jog',
          category: 'editing_timeline',
          behavior: 'continuous',
          parameters: { continuousParam: 'playhead_scrub' },
        },
      },
    ],
  },

  // -------------------------------------------------------------
  // PROFILE D: ROBOTICS & HARDWARE BRIDGE
  // -------------------------------------------------------------
  {
    id: 'profile-robotics-bridge',
    name: 'Robotics Teleoperation & Hardware Bridge',
    version: '1.0.0',
    description: 'Forward dual-stick velocity vectors and gripper commands to external WebSocket robot bridges.',
    category: 'robotics_network',
    outputDestination: {
      type: 'websocket',
      endpointUrl: 'ws://localhost:8765/teleop',
      sendFrequencyHz: 20,
    },
    requiredCapabilities: ['WebSocket API (RFC 6455)'],
    compatibilityNotes: 'Outputs standardized JSON velocity packets (linear.x, angular.z). Connects to local Node.js / Python WebSocket bridges interfacing with ROS / micro-ROS / ESP32. Includes an explicit software emergency-stop control and simulator.',
    mappings: [
      {
        id: 'bot-linear',
        label: 'Left Stick Y -> Linear Drive Velocity (X)',
        enabled: true,
        input: { type: 'axis', axisIndex: 1, deadzone: 0.08, axisDirection: 'both' },
        action: {
          id: 'act-drive',
          name: 'Drive Forward/Reverse',
          category: 'robotics_network',
          behavior: 'continuous',
          parameters: { robotCommand: 'drive', channelKey: 'linear_x' },
        },
      },
      {
        id: 'bot-angular',
        label: 'Right Stick X -> Angular Turn Rate (Z)',
        enabled: true,
        input: { type: 'axis', axisIndex: 2, deadzone: 0.08, axisDirection: 'both' },
        action: {
          id: 'act-turn',
          name: 'Steer / Yaw Rate',
          category: 'robotics_network',
          behavior: 'continuous',
          parameters: { robotCommand: 'turn', channelKey: 'angular_z' },
        },
      },
      {
        id: 'bot-gripper',
        label: 'Right Bumper (RB) -> Toggle Gripper Actuator',
        enabled: true,
        input: { type: 'button', buttonIndex: 5, debounceMs: 150 },
        action: {
          id: 'act-gripper',
          name: 'Actuate Gripper',
          category: 'robotics_network',
          behavior: 'one_shot',
          parameters: { robotCommand: 'gripper', channelKey: 'gripper_state' },
        },
      },
      {
        id: 'bot-estop',
        label: 'Chord (LB + RB) -> Emergency Stop (E-STOP)',
        enabled: true,
        input: { type: 'button_chord', buttonIndices: [4, 5], debounceMs: 50 },
        action: {
          id: 'act-estop',
          name: 'Emergency Software Stop',
          category: 'robotics_network',
          behavior: 'one_shot',
          parameters: { robotCommand: 'emergency_stop', channelKey: 'estop' },
        },
      },
    ],
  },
];
