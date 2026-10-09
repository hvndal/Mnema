import { ControllerMappingEngine } from './controllerMappingEngine';
import { DEFAULT_INTEGRATION_PROFILES } from './defaultIntegrationProfiles';
import type { RawGamepadState } from '../types/telemetry';

export function runIntegrationEngineSelfTests(): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      details.push(`[PASS] ${testName}`);
    } else {
      details.push(`[FAIL] ${testName}`);
      allPassed = false;
    }
  }

  const musicProfile = DEFAULT_INTEGRATION_PROFILES.find(p => p.id === 'profile-midi-music')!;
  const engine = new ControllerMappingEngine(musicProfile);

  // Dummy gamepad state: All released
  const neutralGamepad: RawGamepadState = {
    index: 0,
    id: 'EvoFox One S (Simulated)',
    mapping: 'standard',
    connected: true,
    timestamp: 1000,
    buttons: Array.from({ length: 17 }, (_, i) => ({ index: i, pressed: false, value: 0 })),
    axes: [{ index: 0, value: 0 }, { index: 1, value: 0 }, { index: 2, value: 0 }, { index: 3, value: 0 }],
  };

  // Frame 1: Neutral baseline
  const triggers1 = engine.evaluateFrame(neutralGamepad, 1000);
  assert(triggers1.length === 0, 'Mapping Engine: Neutral state produces 0 triggers');

  // Frame 2: Press Button A (index 0) -> Should trigger MIDI Note 36 (Kick)
  const pressedGamepad: RawGamepadState = {
    ...neutralGamepad,
    buttons: neutralGamepad.buttons.map(b => b.index === 0 ? { ...b, pressed: true, value: 1.0 } : b),
  };

  const triggers2 = engine.evaluateFrame(pressedGamepad, 1050);
  assert(triggers2.length === 1, 'Mapping Engine: Rising edge triggers single action');
  assert(triggers2[0]?.action.parameters.midiNote === 36, 'MIDI Engine: Correct Note 36 (Kick) assigned to A button');
  assert(triggers2[0]?.event === 'activated', 'Edge Trigger: Action event is activated');

  // Frame 3: Continuous Hold (Debounce check) -> Should NOT trigger again
  const triggers3 = engine.evaluateFrame(pressedGamepad, 1060);
  assert(triggers3.length === 0, 'Mapping Engine: Holding button does not fire repeated one-shot');

  // Frame 4: Release Button A -> Should trigger released event (Note Off)
  const triggers4 = engine.evaluateFrame(neutralGamepad, 1100);
  assert(triggers4.length === 1 && triggers4[0]?.event === 'released', 'Mapping Engine: Falling edge fires release event for Note Off');

  // Frame 5: Analog Trigger deadzone test
  const triggerBelowDeadzone: RawGamepadState = {
    ...neutralGamepad,
    buttons: neutralGamepad.buttons.map(b => b.index === 7 ? { ...b, pressed: false, value: 0.03 } : b), // Below 0.05 deadzone
  };
  const triggers5 = engine.evaluateFrame(triggerBelowDeadzone, 1150);
  assert(triggers5.length === 0, 'Analog Deadzone: Trigger input below 0.05 deadzone is filtered out');

  return { passed: allPassed, details };
}
