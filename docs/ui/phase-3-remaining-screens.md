# UI Phase 3: Remaining Screens (Rankings, Players, Player Profile, Match Summary & Settings)

## Overview
Phase 3 completes the core native Apple redesign by overhauling the remaining application surfaces:
1. **Rankings Screen (`AppleRankingsScreen.tsx`)**: Calm, hierarchically ordered standings with a 2-segment controller (Players vs Teams & Pairs), horizontal category chips, elevated top-3 podium (🥇 center elevated), clean inset standings list with match counts, and a modal filter sheet.
2. **Players Screen (`ApplePlayersScreen.tsx`)**: Clean searchable inset list of community players with visual avatars, matches played, win counts, and an "Add Player" modal.
3. **Player Profile Sheet (`ApplePlayerProfileSheet.tsx`)**: Inset bottom sheet with large avatar, rank badge, 3 headline stat tiles (Wins, Win Rate %, Matches), 5-dot recent form strip, rank history sparkline chart (`Recharts`), head-to-head records, and progressive disclosure for detailed metrics.
4. **Match Summary Sheet (`AppleMatchSummarySheet.tsx`)**: Congratulatory winner hero card, game scores breakdown, 3 headline match stats (Total Points, Longest Rally, Events replayed), Share Result button with native Web Share API / clipboard copy, and point-by-point inspection modal.
5. **Settings & Profile Screen (`AppleProfileScreen.tsx`)**: Native iOS grouped settings view with Dark Appearance toggle, 5 Apple accent color selectors, Courtside High Contrast toggle, haptics toggle, active season picker, event sourcing ranking rebuilder, JSON event log exporter, and UI component showcase launcher.

## Key Design Principles Implemented
- **Clarity over density**: Reduced visual clutter by 70%, replaced nested tables with Apple-style grouped inset lists.
- **Progressive disclosure**: Secondary statistics (e.g. shot distribution, total points conceded, point-by-point logs) are tucked behind subtle expandable buttons or modal sheets.
- **Apple HIG styling**: Native typography scale, subtle hairline separators, translucent blurred materials, and consistent haptic feedback.
