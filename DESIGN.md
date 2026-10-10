# DESIGN SYSTEM: ARCADE PHOSPHOR CRT & MODERN 8-BIT
*Google Stitch Semantic Design System Specification*

---

## 1. Visual Atmosphere & Philosophy

- **Density:** 8/10 (High-information tactical laboratory console, dense telemetry readouts, compact PCB cartridge selectors)
- **Variance:** 7/10 (Asymmetric arcade dual-chassis, offset telemetry meters, uneven modular dashboards)
- **Motion:** 6/10 (Crisp 60 FPS hardware telemetry, phosphor glow persistence, snappy 8-bit digital transitions)
- **Atmosphere Descriptor:** *Cold Obsidian Arcade Mainframe Meets Precision Sensor Physics*. Deep carbon chassis with glowing vacuum phosphor traces, ultra-crisp bitmapped status headers, and modern high-contrast readability.

---

## 2. Color Calibration (Tokens & Roles)

Strict token-based palette with zero generic AI purple gradient glows:

```json
{
  "color": {
    "chassis": {
      "base": { "value": "#09090b", "description": "Deep obsidian carbon chassis" },
      "surface": { "value": "#12141a", "description": "Arcade panel card background" },
      "elevated": { "value": "#181b22", "description": "Hover & elevated telemetry surface" },
      "border": { "value": "#27272a", "description": "Hairline structural panel seams" }
    },
    "phosphor": {
      "green": { "value": "#22c55e", "description": "Primary active phosphor, 60fps cadence lock" },
      "green-glow": { "value": "rgba(34, 197, 94, 0.18)", "description": "Subtle cathode ray bloom" },
      "amber": { "value": "#f59e0b", "description": "Warning, secondary telemetry, sensor calibration" },
      "cyan": { "value": "#06b6d4", "description": "Gyro angular velocity & orientation vectors" },
      "rose": { "value": "#f43f5e", "description": "Seismic triggers, false starts, recording indicators" },
      "violet": { "value": "#8b5cf6", "description": "Sensor fusion and acoustic modal cues" }
    },
    "ink": {
      "primary": { "value": "#f4f4f5", "description": "Crisp phosphor white primary text" },
      "secondary": { "value": "#a1a1aa", "description": "Muted hardware labels and metric units" },
      "dim": { "value": "#52525b", "description": "Inactive grid lines and guide axes" }
    }
  }
}
```

### Banned Color Patterns
- ❌ No generic AI magenta/blue neon gradient buttons.
- ❌ No pure pitch black (`#000000`) backgrounds — always `#09090b` or `#0d0f12`.
- ❌ No low-contrast gray-on-gray text.

---

## 3. Typographic Architecture

All typography is divided into three distinct functional tiers:

### 1. Arcade Display & Header Hierarchy
- **Font Stack:** `'Silkscreen'`, `'Press Start 2P'`, `monospace`
- **Role:** Marquee titles, domain selectors, modal banners, arcade status badges.
- **Rules:** Letter-spacing tightly tracked (`tracking-tight` or `tracking-wide` for badges), all uppercase for badges, crisp rendering (`image-rendering: pixelated`).

### 2. High-Density Telemetry & Monospace Data
- **Font Stack:** `'JetBrains Mono'`, `'Space Mono'`, `monospace`
- **Role:** Real-time millisecond timers, angular velocity ($^\circ/\text{s}$), accelerometer vectors ($a_x, a_y, a_z$), frequency bins (Hz), and coordinate readouts.
- **Rules:** Tabular figures enabled (`tabular-nums`) to prevent layout jitter during 50 Hz updates.

### 3. Body & Interface Labels
- **Font Stack:** `'Inter'`, `system-ui`, `-apple-system`, `sans-serif`
- **Role:** Explanatory text, physics formulas, research references, instruction walkthroughs.
- **Rules:** Max line length 65 characters, high contrast `#d4d4d8` against obsidian chassis.

---

## 4. Component Behaviors & Micro-Interactions

### 1. Arcade Push-Buttons (`.pixel-btn`)
- **Idle:** Solid obsidian/zinc-900 background with a 1.5px high-contrast phosphor border (`border-emerald-500/40`), crisp pixelated font.
- **Hover:** Immediate phosphor glow illumination (`box-shadow: 0 0 14px rgba(34, 197, 94, 0.25)`), inset hairline highlight.
- **Active / Pressed:** 2px downward displacement (`transform: translateY(2px)`), instantaneous acoustic click cue.

### 2. Illuminated Cartridge Cards (`.arcade-cartridge`)
- **Structure:** Modular PCB cartridge form factor with corner chamfers, top illuminated category LED, and dark recessed telemetry window.
- **State Indicator:** Pulsing status dot (Green = Nominal / Active, Amber = Calibrating, Rose = Fault / Shaking).

### 3. CRT Scanline & Phosphor Overlay (`.crt-overlay`)
- Fine horizontal raster scanline mask (`linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)`, 3px pitch).
- Subtle radial lens vignette (`radial-gradient(circle, transparent 65%, rgba(0, 0, 0, 0.4) 100%)`).
- Globally toggleable via top-bar `[ CRT: ON / OFF ]` button.

---

## 5. Layout & Spatial Principles

- **8px Micro-Grid:** All paddings, gaps, and component sizes snap strictly to multiples of 4px and 8px (`gap-2`, `gap-4`, `p-6`).
- **Twin Cabinet Split:** Top portal presents a high-impact split arcade cabinet:
  - **Left Cabinet:** Controller Psychophysics Lab (EvoFox One S Gamepad).
  - **Right Cabinet:** Mobile Sensor & IMU Computing Lab (32 Smartphone Modalities).
- **Responsive Stacking:** On mobile viewports ($< 768\text{px}$), twin cabinets stack cleanly with touch-first arcade push targets (minimum $48 \times 48\text{px}$).

---

## 6. Motion Philosophy & Sound Cues

- **Performance Gate:** 60 FPS guaranteed; zero expensive SVG drop-shadow reflows during 50 Hz sensor loops.
- **Sound Design:** Pure Web Audio API square-wave oscillator synthesis:
  - Button Tick: 8-bit blip (`800 Hz` square wave, 15ms decay).
  - Test Start: Ascending arpeggio (`C5 -> E5 -> G5 -> C6`).
  - Pass / Complete: Victorious 8-bit fanfare (`G5 -> C6`).
  - Fault / Warning: Low noise burst (`120 Hz` sawtooth).
