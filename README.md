# Mnema

> Precision reaction-time testing designed ground-up for gamepad controllers. No pseudo-neuroscience, no personality quizzes—just clean psychophysics, millisecond-accurate measurements, and raw performance data.

---

## ⚡ The Philosophy

Most online reaction tests are flimsy web gimmicks wrapped in faux-scientific claims about IQ, brain age, or ADHD.

**Mnema** strips all of that away. It focuses purely on rigorous experimental psychophysics and feel:
- **Controller-First Experience**: Built natively around gamepad input (e.g., EvoFox and standard controllers) via the Gamepad API polling loop, not treated as a desktop afterthought.
- **Microsecond / Sub-Frame Precision**: Precise timing loops, input timestamps, and false-start penalties.
- **Deep Performance Analytics**: Goes far beyond a naive average—surfaces mean, median, standard deviation (variability/jitter), fastest reactions, fatigue curves, and response time distributions.
- **Dynamic Test Conditions**: Unpredictable latency intervals, simple vs. choice reaction time (CRT) paradigms, and visual stimulus variations.
- **Honest Methodology**: Transparent documentation of input lag, browser refresh intervals, and display latency without marketing fluff.
- **Export & Share**: Beautifully rendered, downloadable trial report cards with permalinks and challenge cards to flex on friends.

---

## 🎮 Features

- [ ] **Gamepad Native (Standard Gamepad API)**
  - Direct polling loop (`requestAnimationFrame` + input timestamps) optimized for gamepads like EvoFox.
  - Low-latency tactile feedback (Game Controller Rumble / Vibration API where supported).
  - Full UI navigable via D-pad / Face buttons / Triggers.
- [ ] **Psychophysics & Reaction Paradigms**
  - **Simple Reaction Time (SRT)**: Wait for trigger stimulus with randomized foreperiods (anti-anticipation jitter).
  - **Choice Reaction Time (CRT)**: Multi-button mapping (e.g. D-pad directions or A/B/X/Y) testing cognitive processing speed.
  - **Go / No-Go**: Inhibitory control trials.
- [ ] **Statistical Breakdown**
  - Mean & Median latency (ms)
  - Interquartile Range & Standard Deviation (Consistency / Neuromotor stability)
  - False starts / Anticipation errors count
  - Trial-over-trial fatigue / Warmup degradation trends
- [ ] **High-Fidelity Share Cards**
  - Canvas-generated crisp challenge cards with run summary, distribution curve, and replay link.

---

## 🛠 Tech Stack (Proposed)

- **Frontend**: Vite + React / TypeScript (or lightweight vanilla / Solid for micro-latency overhead)
- **Input Engine**: Web Gamepad API + High-Resolution Time (`performance.now()`)
- **Visuals & Charts**: Minimalist, high-framerate rendering (Tailwind CSS, Canvas/SVG distributions)
- **Share Generator**: HTML5 Canvas rendering engine for instant `.png` generation

---

## 📜 License

MIT
