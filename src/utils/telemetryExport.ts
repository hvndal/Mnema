import type { RawGamepadState, TelemetryFrame, StickCalibrationData } from '../types/telemetry';

export interface TelemetryExportPayload {
  exportDate: string;
  userAgent: string;
  controllerMetadata: {
    index: number;
    id: string;
    mapping: string;
    buttonCount: number;
    axisCount: number;
    timestamp: number;
  } | null;
  stickCalibration: {
    leftStick?: StickCalibrationData;
    rightStick?: StickCalibrationData;
  };
  telemetryFrames: TelemetryFrame[];
}

export function exportTelemetryAsJSON(payload: TelemetryExportPayload, filename: string = 'evofox-controller-telemetry.json') {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportTelemetryAsCSV(frames: TelemetryFrame[], controller: RawGamepadState | null, filename: string = 'evofox-controller-telemetry.csv') {
  if (frames.length === 0) return;

  const buttonCount = controller ? controller.buttons.length : (frames[0]?.buttons.length || 0);
  const axisCount = controller ? controller.axes.length : (frames[0]?.axes.length || 0);

  // Headers
  const headers = [
    'SampleIndex',
    'SampleTimeMs',
    'HardwareTimestamp',
    'StateChanged',
    'IntervalSinceLastChangeMs',
    ...Array.from({ length: buttonCount }, (_, i) => `Btn_${i}_Pressed`),
    ...Array.from({ length: buttonCount }, (_, i) => `Btn_${i}_Value`),
    ...Array.from({ length: axisCount }, (_, i) => `Axis_${i}_Value`),
  ];

  const rows = frames.map(f => {
    const btnPressedCols = Array.from({ length: buttonCount }, (_, i) => (f.buttons[i]?.pressed ? '1' : '0'));
    const btnValCols = Array.from({ length: buttonCount }, (_, i) => (f.buttons[i]?.value !== undefined ? f.buttons[i].value.toFixed(3) : '0'));
    const axisCols = Array.from({ length: axisCount }, (_, i) => (f.axes[i]?.value !== undefined ? f.axes[i].value.toFixed(4) : '0'));

    return [
      f.sampleIndex,
      f.sampleTime.toFixed(2),
      f.hardwareTimestamp.toFixed(2),
      f.hasStateChanged ? '1' : '0',
      f.timeSinceLastChangeMs.toFixed(2),
      ...btnPressedCols,
      ...btnValCols,
      ...axisCols,
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', csvContent);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
