# UI Phase 2: Navigation, Play Screen, 3-Step Setup, and Calm Live Scoring

## Overview
Phase 2 redesigns RallyPoint's primary navigation and core match loop to feel like a native Apple iOS application (Apple Human Interface Guidelines). It replaces complex multi-tier menus with a 4-tab bottom navigation, an unhurried "Play" hero tab, an interactive 3-step bottom sheet for match creation, and an ultra-calm, high-contrast live scoring screen.

## Key Deliverables

### 1. 4-Tab Bottom Navigation (`TabBar.tsx`)
- **Tabs**:
  - `Play` (default)
  - `Rankings`
  - `Players`
  - `Profile` (Settings, themes, appearance, UI component gallery)
- **Design details**:
  - Translucent glass backdrop (`backdrop-blur-xl`, `bg-white/85 dark:bg-[#121214]/85`).
  - Active tab animated pill indicator with gentle spring physics (`stiffness: 320, damping: 32`).
  - Haptic feedback on tab change via `Haptics.selection()`.
  - Conforms to safe-area insets (`env(safe-area-inset-bottom)`).

### 2. Play Tab (`PlayScreen.tsx`)
- **One screen, one job**: A single prominent hero card with a gradient background (`emerald-500` to `teal-700`) and a large "Start Match" button.
- **In-Progress Match Resumption**: If a live match is currently running, an animated alert pill allows instant single-tap resumption.
- **Recent Matches Inset Grouped List**: Shows the last 5 matches with clean typography, participant avatars/names, format tags, and winner badges.

### 3. 3-Step Match Setup Bottom Sheet (`MatchSetupSheet.tsx`)
- **Step 1: Who's playing?**:
  - 2 or 4 player selection with instant search.
  - "Fair Teams" auto-suggestion button for balanced doubles pairing based on Elo rating differential.
- **Step 2: How do you want to score?**:
  - Two large side-by-side selection cards for **Rally Point** vs **Service Point**.
  - Target score segmented pill (21, 15, 11).
  - Progressive disclosure: Advanced options (win by 2, score cap) hidden behind a clean toggle.
- **Step 3: Who serves first?**:
  - Two large side selection cards with player names.
  - Interactive "Flip a coin" button with spring bounce animation.

### 4. Apple Calm Live Scoring Screen (`AppleScoringScreen.tsx`)
- **Calm, Distraction-Free Layout**:
  - Split screen: Two massive tappable halves (Portrait: top/bottom; Landscape: left/right).
  - High contrast `ScoreNumberRoll` displays rolling digits on score changes.
  - Single tap anywhere on a half scores a point with `Haptics.pointScored()`.
  - Quiet middle status bar: Game number (e.g. `Game 1 of 3`), small `🏸` server indicator, and format badge.
  - Only 3 quiet controls visible:
    - `Undo` button at bottom center (`Haptics.undo()`).
    - `...` More button at top right opening match options (Finish match, Retire, Point log, Rules guide, Reset).
    - `Matches` back button at top left to return to dashboard.
- **Service Point Rules Compliance**:
  - When receiver wins a rally, a friendly toast indicates `Serve changes side` without score increment.
  - Setting threshold (14-all / 13-all): Interactive bottom sheet prompts "Set to 17?" vs "Play to 15".
- **Optional Shot Tagging**:
  - 3-second auto-dismiss slim row with 4 chips (`Smash`, `Drop`, `Net`, `Error`). Tagging remains off by default.
- **Screen Wake Lock**:
  - Automatically acquires `navigator.wakeLock` during live play to keep the screen active.
