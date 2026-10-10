# Retro 8-Bit Arcade UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Overview

Transform Mnema into a high-precision, authentic **Arcade Phosphor CRT & Modern 8-Bit** psychophysics and sensor laboratory. The overhaul combines deep obsidian chassis (`#09090b`), phosphor green (`#22c55e`) and cyber amber (`#f59e0b`) accents, Google Fonts (`Silkscreen`, `Press Start 2P`, `Space Mono`), toggleable clean minimalist scanline/CRT shaders, authentic 8-bit sound chip cues, a Google Stitch `DESIGN.md` specification, and an exportable `figma-tokens.json` file for Figma import.

---

## File Structure & Responsibilities

| File | Responsibility |
| :--- | :--- |
| `DESIGN.md` | Single source of truth semantic design system for Google Stitch (colors, typography, component behaviors, micro-animations, anti-patterns). |
| `figma-tokens.json` | W3C / Tokens Studio for Figma compliant design tokens file for instant import into Figma. |
| `FIGMA_EXPORT.md` | Guide for exporting and importing tokens and vector assets into Figma. |
| `index.html` | Google Fonts embedding (`Silkscreen`, `Press Start 2P`, `Space Mono`, `VT323`). |
| `src/index.css` | Phosphor color variables, scanline shader classes, pixelated borders, and CRT filter rules. |
| `src/components/common/RetroCrtEffects.tsx` | Global CRT scanline overlay, scanline opacity management, and particle spark engine. |
| `src/components/Header.tsx` | Arcade marquee header with credit indicators, FPS monitor, and `[ CRT: ON/OFF ]` toggle. |
| `src/components/ModeSelectorPortal.tsx` | Twin arcade cabinet selection portal (Controller Cabinet vs Sensor Rig). |
| `src/components/phone/PhoneGyroLab.tsx` | Tactical 8-bit arcade sensor laboratory console with illuminated push-button selectors. |
| `src/utils/audioCues.ts` | Retro chiptune Web Audio square-wave and noise burst audio synthesis. |

---

## Proposed Tasks

- [ ] **Task 1: Generate Google Stitch `DESIGN.md` & `figma-tokens.json`**
  - Create root `DESIGN.md` in Google Stitch semantic format.
  - Create `figma-tokens.json` compatible with Tokens Studio for Figma and Figma Variables.
  - Create `FIGMA_EXPORT.md` documentation.

- [ ] **Task 2: Embed Fonts & Core CRT / Pixel Styling in `index.html` and `src/index.css`**
  - Add Google Fonts link tags to `index.html`.
  - Add Tailwind/CSS utility classes for pixel corners, phosphor text shadows, scanline grids, and CRT toggle in `src/index.css`.

- [ ] **Task 3: Implement Retro CRT Overlay & Sound Synth (`RetroCrtEffects.tsx` & `audioCues.ts`)**
  - Build `RetroCrtEffects.tsx` with scanlines, subtle vignette, and CRT toggle listener.
  - Add authentic chiptune square-wave sound modes to `audioCues.ts`.

- [ ] **Task 4: Overhaul Header & Portal into Twin Arcade Cabinets**
  - Overhaul `src/components/Header.tsx` with marquee styling, credit counter, and CRT toggle.
  - Overhaul `src/components/ModeSelectorPortal.tsx` with pixel cabinet chassis, illuminated marquees, and phosphor vector highlights.

- [ ] **Task 5: Overhaul Phone Sensor & Gyroscope Laboratory Console**
  - Redesign `src/components/phone/PhoneGyroLab.tsx` domain selector and subtest cards into illuminated arcade cartridges.
  - Polish telemetries, charts, and buttons across sensor components to match the obsidian/phosphor aesthetic.

- [ ] **Task 6: Verification, Build & Deployment**
  - Verify with `tsc -b` and `vite build`.
  - Run all unit test suites.
  - Verify visually in live browser with Chrome DevTools MCP.
  - Commit, push to `origin main`, and verify GitHub Pages deployment.
