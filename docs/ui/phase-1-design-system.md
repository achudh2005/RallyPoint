# RallyPoint Design System (Apple HIG Specification)

## Overview
The `@rallypoint/ui` package delivers a calm, clear, and obvious native iOS design system for RallyPoint following Apple's Human Interface Guidelines (HIG).

---

## 1. Typography Hierarchy
System font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif`
- **Large Title**: 34px (bold, tracking-tight) - Primary screen navigation identity.
- **Title**: 28px (bold) - Section headers.
- **Title 2**: 22px (semibold) - Card / Group headers.
- **Title 3**: 20px (semibold) - Dialog & sheet headers.
- **Headline**: 17px (semibold) - List titles & prominent labels.
- **Body**: 17px (regular) - Primary content & description.
- **Callout**: 16px (regular) - Action item copy.
- **Subhead**: 15px (regular) - Secondary metadata.
- **Footnote / Caption**: 12-13px - Status timestamps & auxiliary badges.

Dynamic Type scaling support (`standard`, `large` +15%, `accessibility` +30%).

---

## 2. Color System & Apple Materials
- **Light Theme**:
  - Primary Background: `#FFFFFF`
  - Grouped Background: `#F2F2F7`
  - Elevated Cards: `#FFFFFF` with 0.5px hairline border `rgba(60, 60, 67, 0.18)`
- **Dark Theme**:
  - Primary Background: `#000000` (True OLED Black)
  - Grouped Background: `#000000`
  - Elevated Cards: `#1C1C1E` (Apple System Gray 6)
  - Secondary Elevated: `#2C2C2E`
- **User-Selectable Accent Colors**:
  - **Wimbledon Green** (`#34C759` / `#30D158`)
  - **Court Blue** (`#007AFF` / `#0A84FF`)
  - **Shuttle Teal** (`#30B0C7` / `#40C8E0`)
  - **Smash Indigo** (`#5856D6` / `#5E5CE6`)
  - **Champion Gold** (`#FF9500` / `#FF9F0A`)
- **Semantic Colors**:
  - Success: Apple Green (`#34C759`)
  - Destructive: Apple Red (`#FF3B30`)
  - Warning: Apple Amber (`#FF9500`)

---

## 3. Motion & Haptics
- **Framer Motion Spring Physics**: `stiffness: 320, damping: 32, mass: 1`
- **Score Number Roll**: Gentle vertical digit sliding animation on score changes.
- **Haptic Engine (`navigator.vibrate`)**:
  - Selection: 10ms
  - Point scored: 18ms
  - Undo: 15ms-30ms-15ms
  - Side change: 25ms-40ms-25ms
  - Game won: 40ms-60ms-40ms-60ms-80ms
  - Respects `prefers-reduced-motion`.

---

## 4. Components Catalog
1. `LargeTitle`: Apple-style bold 34px title with subtitle and trailing action.
2. `GroupedList` & `GroupedRow`: Inset iOS cards with hairline dividers, icons, subtitles, and chevrons.
3. `SegmentedControl`: Sliding pill segmented control with animated Framer Motion layoutId indicator.
4. `BottomSheet`: Native sheet with top grabber handle, gesture drag-to-dismiss, and backdrop blur.
5. `Toast`: Floating pill banner with built-in 5-second countdown timer and instant Undo button.
6. `Toggle`: Smooth iOS switch with spring knob.
7. `Stepper`: Accessible decrement/increment control (`-` `[ value ]` `+`).
8. `Avatar`: Continuous squircle avatar with deterministic pastel gradient and serving/winner badges.
9. `Badge`: Semantic pills (`accent`, `success`, `warning`, `destructive`, `neutral`).
10. `EmptyState`: Friendly icon, title, one-sentence description, and clear pill CTA button.
11. `Skeleton`: Pulsing placeholder loading blocks.
12. `Button`: iOS style primary (accent filled), secondary (tinted gray), glass, and destructive buttons.
13. `ScoreNumberRoll`: Animated vertical digit roller.
14. `ComponentGallery`: Interactive Storybook/Gallery showcase component documenting every component and token.
