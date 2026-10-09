export const STANDARD_BUTTON_NAMES: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'Back / Select',
  9: 'Start',
  10: 'L-Stick Click',
  11: 'R-Stick Click',
  12: 'D-Pad Up',
  13: 'D-Pad Down',
  14: 'D-Pad Left',
  15: 'D-Pad Right',
  16: 'Home / Guide',
};

export const STANDARD_BUTTON_COLORS: Record<number, string> = {
  0: '#10b981', // Emerald / Green for A
  1: '#f43f5e', // Rose / Red for B
  2: '#3b82f6', // Blue for X
  3: '#eab308', // Amber / Yellow for Y
  12: '#a855f7', // Purple for Up
  13: '#a855f7', // Purple for Down
  14: '#a855f7', // Purple for Left
  15: '#a855f7', // Purple for Right
};

/**
 * Triggers haptic rumble if supported by the browser and controller.
 */
export async function triggerRumble(
  gamepad: Gamepad | null,
  durationMs: number = 80,
  strongMagnitude: number = 0.5,
  weakMagnitude: number = 0.5
) {
  if (!gamepad) return;
  try {
    const actuator = (gamepad as any).vibrationActuator;
    if (actuator && typeof actuator.playEffect === 'function') {
      await actuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: durationMs,
        weakMagnitude,
        strongMagnitude,
      });
    }
  } catch {
    // Ignore rumble errors (e.g. unsupported by browser or dongle)
  }
}
