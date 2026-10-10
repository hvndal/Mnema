# How to Import Mnema Design Tokens into Figma

This repository includes a standard W3C / Tokens Studio for Figma compliant design tokens file: **[`figma-tokens.json`](figma-tokens.json)**.

You can import this directly into Figma using either of the two standard workflows:

---

## Method 1: Tokens Studio for Figma (Recommended)

1. Open your design file in **Figma**.
2. Run the **Tokens Studio for Figma** plugin (`Plugins > Tokens Studio for Figma`).
3. Click on **Settings** (or the gear icon) inside the plugin.
4. Select **Add new set** or **Import**.
5. Choose **Import from file** and select **`figma-tokens.json`** from this project directory.
6. Click **Apply to Document**.
7. All Color Styles, Typography Styles, Spacing Variables, and Phosphor Glow Shadows will be automatically generated in your Figma document.

---

## Method 2: Figma Variables Import (Native)

1. In Figma, open the **Variables** modal from the right-hand design sidebar.
2. If using the official **Variables Import / Export** plugin or CLI:
   - Import `figma-tokens.json`.
3. The following variable collections will be established:
   - **`color/chassis`**: Deep obsidian background, surface, and border tokens.
   - **`color/phosphor`**: Cathode ray green, cyber amber, arcade cyan, and laser rose.
   - **`color/ink`**: High-contrast white and muted label tokens.
   - **`spacing`**: 4px to 64px 8-bit layout grids.
   - **`borderRadius`**: Sharp arcade corners to pill badges.

---

## Typography Note for Figma

To render the arcade display fonts properly in Figma, ensure you have enabled or installed the Google Fonts:
- **`Silkscreen`** (Arcade Marquee & Badges)
- **`Press Start 2P`** (8-Bit Retro Gaming Accents)
- **`Space Mono`** or **`JetBrains Mono`** (High-Density Telemetry & Clocks)
- **`Inter`** (Body Text & Scientific References)
