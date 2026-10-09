# Mnema

> **Controller Psychophysics & Precision Measurement Lab**  
> Ground-up browser-based performance testing, diagnostic telemetry, and creative hardware mapping for the EvoFox One S and standard gamepads.

Live deployment: [https://hvndal.github.io/Mnema/](https://hvndal.github.io/Mnema/)

---

## ⚡ The Philosophy

Most online reaction tests are flimsy web gimmicks wrapped in faux-scientific claims about IQ or brain age.

**Mnema** strips all of that away. It focuses purely on rigorous experimental psychophysics, sub-millisecond precision, and controller hardware feel:
- **Controller-First Experience**: Built natively around gamepad input via the browser Gamepad API polling loop (`requestAnimationFrame` + `performance.now()`), optimized for the EvoFox One S and X-Input/DirectInput controllers.
- **Microsecond Precision & Anti-Anticipation**: Randomized foreperiod delays (1500ms–4000ms), false-start tracking, and edge-triggered button state transitions.
- **Deep Performance Analytics**: Surfaces mean, median, standard deviation (variability/jitter), fastest reactions, fatigue curves, path efficiency, and response distributions.
- **Honest Methodology**: Transparent documentation of input lag, browser refresh intervals, and display latency without marketing fluff.
- **Export & Share**: High-fidelity PNG result cards, JSON session exports, CSV telemetry dumps, and historical comparisons.

---

## 🎮 Modules & Capabilities

### 1. Controller Lab & Diagnostics
- **Interactive Gamepad Schematic**: Live 2D vector visualizer highlighting face buttons, D-pad, shoulder bumpers, and analog stick displacement in real time.
- **2D Stick Calibration**: Resting center drift detection, 360° range bounding box recording, and recommended dead-zone calculation.
- **Raw Channel Telemetry**: Live polling frequency monitor, state-change interval metrics, and event log.

### 2. Psychophysics Reaction Lab
- **Simple Reaction Time (SRT)**: Measure raw sensory-motor latency with randomized foreperiods.
- **Choice Reaction Time (CRT)**: Measure cognitive decision latency across randomized button prompts (A, B, X, Y).
- **Go / No-Go Paradigm**: Measure inhibitory motor control with non-target distractor signals.

### 3. Precision & Tracking Lab
- **Target Acquisition**: Measure motor targeting speed, path efficiency (Euclidean vs actual trajectory), and endpoint spatial error under Fitts's Law paradigms.
- **Continuous Tracking**: Quantify analog stick smooth pursuit accuracy following a moving target, calculating Root Mean Square Error (RMSE) and Time-in-Target percentage.

### 4. Controller Integration Engine
- **MIDI Synthesizer**: Map face buttons to musical notes and analog sticks to pitch bend / modulation wheels.
- **Media Controller**: Control volume, scrubber, and playback controls.
- **NLE Video Scrubbing**: Jog wheel simulation for video editing timelines.
- **Robotics / Telemetry**: Broadcast high-resolution normalized axes over WebSocket streams.

### 5. Session History & Shareable Challenge Cards
- **Local Persistence**: IndexedDB client-side database storing trial-by-trial logs, controller metadata, and timestamps across browser sessions.
- **Comparative Analysis**: Performance progression deltas comparing baseline vs recent sessions.
- **Downloadable Challenge Cards**: Instant HTML5 Canvas export of high-resolution graphic cards with performance metrics.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 (Light-first editorial aesthetic)
- **Input API**: Browser Gamepad API (`navigator.getGamepads()`)
- **Icons**: Lucide React
- **Storage**: IndexedDB (`mnema_sessions_db`)
- **Exports**: HTML5 Canvas (`toDataURL`), Blob JSON/CSV downloads

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- EvoFox One S or any standard USB/Wireless Gamepad (Xbox, PlayStation, or generic HID)

### Installation

```bash
# Clone the repository
git clone https://github.com/hvndal/Mnema.git

# Enter repository directory
cd Mnema

# Install dependencies
npm install

# Start Vite local development server
npm run dev

# Run self-test verification suites
npx tsx -e "import { runPrecisionTrackingSelfTests } from './src/utils/precisionTracking.test.ts'; runPrecisionTrackingSelfTests();"
npx tsx -e "import { runIntegrationEngineSelfTests } from './src/utils/controllerMappingEngine.test.ts'; runIntegrationEngineSelfTests();"
npx tsx -e "import { runHistoryAndComparisonSelfTests } from './src/utils/sessionComparison.test.ts'; runHistoryAndComparisonSelfTests();"

# Build for production
npm run build
```

---

## 📜 License

MIT
