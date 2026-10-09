import type { RawGamepadState } from '../types/telemetry';
import type {
  IntegrationProfile,
  ActionDefinition,
} from '../types/integration';

export interface EvaluatedActionTrigger {
  mappingId: string;
  action: ActionDefinition;
  event: 'activated' | 'released' | 'continuous_update';
  value: number; // 0.0 to 1.0 or axis magnitude
  timestamp: number;
}

export class ControllerMappingEngine {
  private activeProfile: IntegrationProfile;
  private prevButtonStates: Map<number, boolean> = new Map();
  private prevButtonValues: Map<number, number> = new Map();
  private prevAxisValues: Map<number, number> = new Map();
  private lastTriggerTimes: Map<string, number> = new Map();

  constructor(initialProfile: IntegrationProfile) {
    this.activeProfile = initialProfile;
  }

  public setProfile(profile: IntegrationProfile) {
    this.activeProfile = profile;
    this.reset();
  }

  public getProfile(): IntegrationProfile {
    return this.activeProfile;
  }

  public reset() {
    this.prevButtonStates.clear();
    this.prevButtonValues.clear();
    this.prevAxisValues.clear();
    this.lastTriggerTimes.clear();
  }

  /**
   * Evaluates raw gamepad state against active profile mappings on each frame.
   * Emits triggered actions with edge detection, debouncing, chord detection, and deadzones.
   */
  public evaluateFrame(gamepad: RawGamepadState, timestamp: number): EvaluatedActionTrigger[] {
    const triggered: EvaluatedActionTrigger[] = [];

    for (const mapping of this.activeProfile.mappings) {
      if (!mapping.enabled) continue;

      const action = mapping.action;
      const input = mapping.input;
      const mappingKey = mapping.id;

      // 1. Single Button Binding
      if (input.type === 'button' && input.buttonIndex !== undefined) {
        const btn = gamepad.buttons[input.buttonIndex];
        const isPressed = btn ? (btn.pressed || btn.value > (input.activationThreshold ?? 0.45)) : false;
        const wasPressed = !!this.prevButtonStates.get(input.buttonIndex);

        const debounce = input.debounceMs ?? 30;
        const lastTrigger = this.lastTriggerTimes.get(mappingKey) ?? 0;

        // Rising Edge (Press)
        if (isPressed && !wasPressed && (timestamp - lastTrigger >= debounce)) {
          this.lastTriggerTimes.set(mappingKey, timestamp);
          triggered.push({
            mappingId: mapping.id,
            action,
            event: 'activated',
            value: btn?.value ?? 1.0,
            timestamp,
          });
        }
        // Falling Edge (Release)
        else if (!isPressed && wasPressed) {
          triggered.push({
            mappingId: mapping.id,
            action,
            event: 'released',
            value: 0,
            timestamp,
          });
        }
      }

      // 2. Button Chord (Combination, e.g. LB + RB)
      else if (input.type === 'button_chord' && input.buttonIndices && input.buttonIndices.length > 1) {
        const allPressed = input.buttonIndices.every(idx => {
          const b = gamepad.buttons[idx];
          return b ? (b.pressed || b.value > (input.activationThreshold ?? 0.45)) : false;
        });

        const wasChordPressed = !!this.prevButtonStates.get(9999 + input.buttonIndices[0]);

        if (allPressed && !wasChordPressed) {
          this.prevButtonStates.set(9999 + input.buttonIndices[0], true);
          triggered.push({
            mappingId: mapping.id,
            action,
            event: 'activated',
            value: 1.0,
            timestamp,
          });
        } else if (!allPressed && wasChordPressed) {
          this.prevButtonStates.set(9999 + input.buttonIndices[0], false);
          triggered.push({
            mappingId: mapping.id,
            action,
            event: 'released',
            value: 0,
            timestamp,
          });
        }
      }

      // 3. Analog Trigger Binding (Continuous or Threshold)
      else if (input.type === 'trigger' && input.buttonIndex !== undefined) {
        const btn = gamepad.buttons[input.buttonIndex];
        const rawVal = btn?.value ?? 0;
        const deadzone = input.deadzone ?? 0.05;
        const prevVal = this.prevButtonValues.get(input.buttonIndex) ?? 0;

        const effectiveVal = rawVal > deadzone ? (rawVal - deadzone) / (1 - deadzone) : 0;

        if (action.behavior === 'continuous') {
          // Emit continuous updates if value changes significantly
          if (Math.abs(effectiveVal - prevVal) > 0.015) {
            this.prevButtonValues.set(input.buttonIndex, effectiveVal);
            triggered.push({
              mappingId: mapping.id,
              action,
              event: 'continuous_update',
              value: effectiveVal,
              timestamp,
            });
          }
        } else {
          // Threshold actuation
          const threshold = input.activationThreshold ?? 0.5;
          const isActuated = effectiveVal >= threshold;
          const wasActuated = prevVal >= threshold;

          if (isActuated && !wasActuated) {
            triggered.push({
              mappingId: mapping.id,
              action,
              event: 'activated',
              value: effectiveVal,
              timestamp,
            });
          } else if (!isActuated && wasActuated) {
            triggered.push({
              mappingId: mapping.id,
              action,
              event: 'released',
              value: 0,
              timestamp,
            });
          }
          this.prevButtonValues.set(input.buttonIndex, effectiveVal);
        }
      }

      // 4. Analog Stick Axis Binding (Continuous deflection or Directional Threshold)
      else if (input.type === 'axis' && input.axisIndex !== undefined) {
        const rawAxis = gamepad.axes[input.axisIndex]?.value ?? 0;
        const deadzone = input.deadzone ?? 0.08;
        const prevAxis = this.prevAxisValues.get(input.axisIndex) ?? 0;

        const mag = Math.abs(rawAxis);
        let effectiveVal = 0;

        if (mag > deadzone) {
          const norm = (mag - deadzone) / (1 - deadzone);
          effectiveVal = (rawAxis >= 0 ? 1 : -1) * norm;
        }

        if (action.behavior === 'continuous') {
          if (Math.abs(effectiveVal - prevAxis) > 0.01) {
            this.prevAxisValues.set(input.axisIndex, effectiveVal);
            triggered.push({
              mappingId: mapping.id,
              action,
              event: 'continuous_update',
              value: effectiveVal,
              timestamp,
            });
          }
        }
      }
    }

    // Save button states for edge detection next frame
    gamepad.buttons.forEach((btn, idx) => {
      this.prevButtonStates.set(idx, btn.pressed || btn.value > 0.45);
    });

    return triggered;
  }
}
