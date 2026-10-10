import {
  calculateRpm,
  analyzeSwing,
  recognizeAirShape,
  classifyKeystrokeQuadrant,
  integrateElevatorDisplacement,
  processScgSignals,
  computeStaLtaRatio,
  detectPotholes,
  calculateDopplerVelocity,
  computePpgHrv,
  updateDeadReckoning,
  classifySurfaceResonance,
  computeSensorIdDigest,
} from './phoneSensorsAdvancedMath';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('Running phoneSensorsAdvancedMath unit tests...');

// 1. RPM calculation
const rpmTurntable = calculateRpm(198); // ~33.3 RPM turntable (33.3 * 6 = 199.8 deg/s)
assert(rpmTurntable === 33, `RPM should be 33, got ${rpmTurntable}`);

const rpm45 = calculateRpm(270); // 45 RPM
assert(rpm45 === 45, `RPM should be 45, got ${rpm45}`);

// 2. Swing analysis
const swingSamples = [
  { timestamp: 0, rateDegPerSec: 0 },
  { timestamp: 100, rateDegPerSec: 50 },
  { timestamp: 200, rateDegPerSec: 300 },
  { timestamp: 300, rateDegPerSec: 1200 }, // Peak
  { timestamp: 400, rateDegPerSec: 400 },
  { timestamp: 500, rateDegPerSec: 50 },
];
const swing = analyzeSwing(swingSamples);
assert(swing.peakSpeedDegPerSec === 1200, `Peak speed should be 1200, got ${swing.peakSpeedDegPerSec}`);
assert(swing.impactSpeedKmh > 50, `Impact speed should be > 50 km/h, got ${swing.impactSpeedKmh}`);
assert(swing.totalSwingDurationMs > 0, 'Total swing duration should be positive');

// 3. Air Writing Shape Recognizer
// Circle points
const circlePoints = [];
for (let i = 0; i <= 20; i++) {
  const theta = (i / 20) * 2 * Math.PI;
  circlePoints.push({
    x: 100 + 50 * Math.cos(theta),
    y: 100 + 50 * Math.sin(theta),
    timestamp: i * 50,
  });
}
const circleShape = recognizeAirShape(circlePoints);
assert(circleShape === 'circle', `Shape should be circle, got ${circleShape}`);

// Zigzag points
const zigzagPoints = [
  { x: 0, y: 0, timestamp: 0 },
  { x: 20, y: 10, timestamp: 20 },
  { x: 5, y: 20, timestamp: 40 },
  { x: 25, y: 30, timestamp: 60 },
  { x: 2, y: 40, timestamp: 80 },
  { x: 30, y: 50, timestamp: 100 },
  { x: 1, y: 60, timestamp: 120 },
  { x: 28, y: 70, timestamp: 140 },
  { x: 0, y: 80, timestamp: 160 },
  { x: 30, y: 90, timestamp: 180 },
  { x: 2, y: 100, timestamp: 200 },
  { x: 29, y: 110, timestamp: 220 },
  { x: 1, y: 120, timestamp: 240 },
  { x: 30, y: 130, timestamp: 260 },
  { x: 3, y: 140, timestamp: 280 },
];
const zigzagShape = recognizeAirShape(zigzagPoints);
assert(zigzagShape === 'zigzag', `Shape should be zigzag, got ${zigzagShape}`);

// 4. Keystroke quadrant leak
assert(classifyKeystrokeQuadrant(0.3, -0.2) === 'top-left', 'Expected top-left');
assert(classifyKeystrokeQuadrant(0.4, 0.5) === 'top-right', 'Expected top-right');
assert(classifyKeystrokeQuadrant(-0.25, -0.3) === 'bottom-left', 'Expected bottom-left');
assert(classifyKeystrokeQuadrant(-0.25, 0.4) === 'bottom-right', 'Expected bottom-right');
assert(classifyKeystrokeQuadrant(0.01, -0.02) === 'center', 'Expected center');

// 5. Elevator displacement double-integration
const elevatorSamples = [
  { timestamp: 0, accelZ: 9.81 },
  { timestamp: 100, accelZ: 9.81 },
  { timestamp: 200, accelZ: 11.2 }, // upward surge
  { timestamp: 300, accelZ: 11.2 },
  { timestamp: 400, accelZ: 9.81 },
  { timestamp: 500, accelZ: 9.81 },
];
const elevatorResult = integrateElevatorDisplacement(elevatorSamples, 0.1);
assert(elevatorResult.length === 6, 'Elevator samples count mismatch');
assert(elevatorResult[elevatorResult.length - 1].displacementMeters >= 0, 'Displacement should be >= 0');

// 6. SCG signals
const scgSamples = [];
for (let i = 0; i < 60; i++) {
  scgSamples.push({
    timestamp: i * 50,
    accelZ: 9.81 + Math.sin((i * 50 * 2 * Math.PI) / 800) * 0.15,
  });
}
const scg = processScgSignals(scgSamples);
assert(scg.estimatedBpm >= 50 && scg.estimatedBpm <= 120, `SCG BPM range invalid: ${scg.estimatedBpm}`);
assert(scg.respirationBreathsPerMin > 0, 'Respiration rate must be > 0');

// 7. STA/LTA ratio
const staLtaNormal = computeStaLtaRatio([0.1, 0.1, 0.1], [0.1, 0.1, 0.1, 0.1]);
assert(staLtaNormal === 1, `Normal STA/LTA should be 1, got ${staLtaNormal}`);
const staLtaQuake = computeStaLtaRatio([1.5, 2.0, 1.8], [0.1, 0.1, 0.1, 0.1]);
assert(staLtaQuake > 10, `Quake STA/LTA should be > 10, got ${staLtaQuake}`);

// 8. Pothole detection
const roadSamples = [
  { timestamp: 0, accelZ: 9.81 },
  { timestamp: 100, accelZ: 9.81 },
  { timestamp: 200, accelZ: 25.0 }, // Jolt > 2.5g
  { timestamp: 300, accelZ: 9.81 },
];
const potholes = detectPotholes(roadSamples, 1.35);
assert(potholes.length === 1, `Should find 1 pothole, found ${potholes.length}`);
assert(potholes[0].severity === 'severe', 'Severity should be severe');

// 9. Doppler velocity
const dopplerVel = calculateDopplerVelocity(55, 19000, 343);
assert(dopplerVel > 0, `Doppler velocity should be positive: ${dopplerVel}`);

// 10. PPG HRV
const hrv = computePpgHrv([800, 850, 810, 840, 820]);
assert(hrv.rmssd > 0, 'HRV RMSSD should be > 0');
assert(hrv.sdnn > 0, 'HRV SDNN should be > 0');

// 11. Dead Reckoning
const pdr = updateDeadReckoning({ x: 0, y: 0 }, 0.75, 90); // 90 deg = East (+X)
assert(Math.abs(pdr.x - 0.75) < 0.05, `PDR X should be ~0.75, got ${pdr.x}`);
assert(Math.abs(pdr.y) < 0.05, `PDR Y should be ~0, got ${pdr.y}`);

// 12. Surface classification
assert(classifySurfaceResonance(20, 100) === 'Soft Cushion / Bed', 'Should be Soft Cushion');
assert(classifySurfaceResonance(100, 450) === 'Hard Wood / Metal Desk', 'Should be Hard Wood / Metal');
assert(classifySurfaceResonance(100, 250) === 'Hollow Resonance Box', 'Should be Hollow Resonance');

// 13. SensorID digest
const digest1 = computeSensorIdDigest({ x: 0.012, y: -0.045, z: 9.802 }, { roll: 0.003, pitch: -0.002, yaw: 0.001 });
const digest2 = computeSensorIdDigest({ x: 0.012, y: -0.045, z: 9.802 }, { roll: 0.003, pitch: -0.002, yaw: 0.001 });
assert(digest1.startsWith('SID-'), 'Digest should start with SID-');
assert(digest1 === digest2, 'Digest should be deterministic');

console.log('✅ All phoneSensorsAdvancedMath tests passed successfully!');
