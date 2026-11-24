# UI Phase 4: Interaction Polish, Responsive Layouts, Onboarding, Accessibility, and Final Release

## Overview
Phase 4 puts the final Apple polish on RallyPoint:
1. **First-Run Onboarding (`OnboardingSheet.tsx`)**:
   - 3-card swipeable / stepper walkthrough explaining:
     - Card 1: *Score in 10 Seconds* (lightning-fast split tapping, single-tap undo).
     - Card 2: *Rally or Service Point* (flexible rule engines, 21/15/11 targets, automatic setting choices).
     - Card 3: *Live Community Rankings* (point-by-point recalculation, balanced doubles pair suggestions, podium standings).
   - Automatically shown on initial launch and persistent status saved to local storage.
2. **Confetti Celebration (`ConfettiCelebration.tsx`)**:
   - Lightweight, zero-dependency HTML5 Canvas particle system triggered upon match completion.
   - Dynamic colors, gravity, air friction, rotation, and fading.
3. **Gym / Arena TV Scoreboard View (`TVScoreboardScreen.tsx`)**:
   - Ultra-high contrast stadium display optimized for gymnasium TVs, external monitors, and overhead projectors.
   - Massive 120-220pt digit counters for Side A and Side B.
   - Real-time active server shuttle badge (`🏸 Serving`), games breakdown footer, and fullscreen arena toggle (`Maximize2` / `Minimize2`).
4. **Keyboard Accessibility & Referee Shortcuts (`AppleScoringScreen.tsx`)**:
   - `ArrowUp` or `1`: Record point for Side A.
   - `ArrowDown` or `2`: Record point for Side B.
   - `u` or `Backspace`: Revert last point with haptic feedback.
   - `s` / `d` / `n`: Tag rally shot type (Smash, Drop, Net).
   - TV launcher button (`Tv`) directly in the header.
5. **Accessibility (a11y) & Dynamic Type**:
   - `aria-live="assertive"` screen reader region continuously announcing real-time score and server states.
   - High-contrast typography scale (SF Pro scale) compliant with WCAG AA guidelines.
   - Responsive layout adapting smoothly between compact mobile, tablet two-pane (`md:`), and desktop floating dock (`lg:`).
