# Match MVP Worked Examples (12 Golden Cases)

Formula (`v1.0.0`):
$$\text{MVP Score} = 3.0 \cdot \text{pointsWon} + 2.5 \cdot \text{serveRegained} \cdot M + 2.0 \cdot \text{clutchPoints} + 1.5 \cdot \text{comebackPoints} + 1.0 \cdot \text{streakBonus} - 2.0 \cdot \text{drops} - 1.0 \cdot \text{clutchDrops} + \text{resultBonus}$$

- $M = 1.5$ for Service Point (`SERVICE_*`), $M = 1.0$ for Rally Point.
- $\text{streakBonus} = \max(0, \text{bestPointStreak} - 2)$.
- $\text{resultBonus} = 5.0$ for winning side, $0$ for losing side.
- Qualification threshold: $\max(2, \min(5, \lfloor 0.4 \times \text{avgActionsPerPlayer} \rfloor))$.
- Tie-breakers: (1) MVP Score desc, (2) Drops asc, (3) Serve Regained desc, (4) Clutch Points desc, (5) Winning Side, (6) Co-MVPs.

| # | Scenario | Expected MVP | Expected Fighter | Key Verification |
|---|----------|--------------|------------------|------------------|
| 1 | Doubles Rally 21 | Winning side top scorer | Best losing side player | Standard weights + resultBonus +5 |
| 2 | Service Point 15 with side-outs | Receiver who regained serve most | Best losing side player | $2.5 \times 1.5 = 3.75$ per serve regain |
| 3 | Setting game (14-all set to 17) | Clutch performer in setting | Losing clutch performer | `SETTING_CHOICE` activates clutch |
| 4 | Comeback match (trailed by >= 4) | Comeback player | Leading-then-losing player | `comebackPoints` (+1.5 each) |
| 5 | Shutout game (7-0) | Top scorer (relative qual >= 2) | Losing player (or null if 0 actions) | Clutch = 0 (not applicable in shutout) |
| 6 | All-drops match | Player with fewest drops / win bonus | Losing player with fewest drops | Negative/low scores still rank deterministically |
| 7 | Match with unattributed rallies | Top attributed player | Best losing attributed player | Unattributed rallies counted in `unassignedCount`, never credited to players |
| 8 | Singles match (`singlesMvpEnabled: false`) | Match winner | Loser | Winner is MVP by default; ratings computed for both |
| 9 | Exact tie on all 5 criteria | Co-MVPs (both listed in `coMvps`) | Losing player | `coMvps.length === 2` |
| 10 | No one qualifies (< 2 actions each) | `null` (`isQualified: false`) | `null` | `disqualificationReason` provided |
| 11 | Match with archived/hidden player | Archived player still wins MVP | Archived/active loser | Archived status does not block historical MVP |
| 12 | Match edited after the fact | Recomputed new MVP | Recomputed Fighter | Re-attributing action updates MVP deterministically |
