import type {
  ScoringEvent,
  StreakAlertsConfig,
  StreakMilestoneAlert,
  PlayerStreakRecord,
  StreaksResult,
} from './types.js';

export const DEFAULT_STREAK_CONFIG: Required<StreakAlertsConfig> = {
  pointStreakThresholds: [3, 5, 7, 10],
  dropStreakThresholds: [3, 5],
  teamRunThresholds: [5, 8, 10],
  strictMode: false,
  streakSnappedEnabled: false,
  hapticsEnabled: false,
  dropStreaksEnabled: true,
  language: 'en',
};

// Localization dictionaries
export const STREAK_LOCALIZATIONS = {
  en: {
    point3: '{name} is on fire: 3 points in a row!',
    point5: '{name} has won 5 points in a row!',
    point7: '{name} is unstoppable: 7 points in a row!',
    point10: '{name} is in the zone: 10 points in a row!',
    pointGeneric: '{name} has won {count} points in a row!',
    drop3: '{name}: 3 drops in a row, take a breath',
    drop5: 'Shake it off, {name}, next point is yours',
    dropGeneric: '{name}: {count} drops, stay focused',
    teamRun5: '{team} is on a 5-0 run!',
    teamRun8: '{team} is on an 8-0 run!',
    teamRun10: '{team} is on a 10-0 run!',
    teamRunGeneric: '{team} is on a {count}-0 run!',
    streakSnapped: "{name}'s {count}-point streak ended",
  },
  ml: {
    point3: '{name} മികച്ച ഫോമിലാണ്: തുടർച്ചയായി 3 പോയിന്റുകൾ!',
    point5: '{name} തുടർച്ചയായി 5 പോയിന്റുകൾ നേടി മുന്നേറുന്നു!',
    point7: '{name} അജയ്യനാണ്: തുടർച്ചയായി 7 പോയിന്റുകൾ!',
    point10: '{name} അപാരമായ കളി പുറത്തെടുക്കുന്നു: 10 പോയിന്റുകൾ!',
    pointGeneric: '{name} തുടർച്ചയായി {count} പോയിന്റുകൾ നേടി!',
    drop3: '{name}: തുടർച്ചയായി 3 ഡ്രോപ്പുകൾ, അൽപ്പം ആശ്വസിക്കൂ',
    drop5: 'സാരമില്ല {name}, അടുത്ത പോയിന്റ് നിങ്ങളുടേതാണ്',
    dropGeneric: '{name}: {count} ഡ്രോപ്പുകൾ, ശ്രദ്ധയോടെ കളിക്കൂ',
    teamRun5: '{team} 5-0 കുതിപ്പിലാണ്!',
    teamRun8: '{team} 8-0 കുതിപ്പിലാണ്!',
    teamRun10: '{team} 10-0 കുതിപ്പിലാണ്!',
    teamRunGeneric: '{team} {count}-0 കുതിപ്പിലാണ്!',
    streakSnapped: '{name}-ന്റെ {count}-പോയിന്റ് കുതിപ്പ് അവസാനിച്ചു',
  },
};

export function formatStreakMessage(
  key: keyof (typeof STREAK_LOCALIZATIONS)['en'],
  lang: 'en' | 'ml' = 'en',
  params: Record<string, string | number> = {}
): string {
  const dict = STREAK_LOCALIZATIONS[lang] || STREAK_LOCALIZATIONS.en;
  let template = dict[key] || STREAK_LOCALIZATIONS.en[key] || '';
  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return template;
}

export interface MatchPlayerLookup {
  getPlayerName?: (playerId: string) => string;
  getTeamName?: (side: 'A' | 'B') => string;
}

/**
 * Pure dependency-free function computing live player & team streaks,
 * milestone alerts, and overall match records from the append-only event log.
 */
export function computeStreaks(
  events: ScoringEvent[],
  config: StreakAlertsConfig = {},
  lookup?: MatchPlayerLookup
): StreaksResult {
  const cfg = { ...DEFAULT_STREAK_CONFIG, ...config };
  const pointThresholds = new Set(cfg.pointStreakThresholds);
  const dropThresholds = new Set(cfg.dropStreakThresholds);
  const runThresholds = new Set(cfg.teamRunThresholds);

  const playerStreaks: Record<string, PlayerStreakRecord> = {};
  const teamRuns = { A: 0, B: 0 };
  const bestTeamRuns = { A: 0, B: 0 };

  // Track fired milestone counts for current streak instances to avoid duplicates
  const firedPointMilestones: Record<string, Set<number>> = {};
  const firedDropMilestones: Record<string, Set<number>> = {};
  const firedTeamRunMilestones = { A: new Set<number>(), B: new Set<number>() };

  const milestoneHistory: StreakMilestoneAlert[] = [];
  let currentMilestone: StreakMilestoneAlert | null = null;

  const getPlayer = (playerId: string): PlayerStreakRecord => {
    if (!playerStreaks[playerId]) {
      playerStreaks[playerId] = {
        playerId,
        currentPointStreak: 0,
        currentDropStreak: 0,
        bestPointStreak: 0,
        longestDropStreak: 0,
      };
      firedPointMilestones[playerId] = new Set<number>();
      firedDropMilestones[playerId] = new Set<number>();
    }
    return playerStreaks[playerId]!;
  };

  const getPName = (pId: string): string => {
    return lookup?.getPlayerName?.(pId) || pId;
  };

  const getTName = (side: 'A' | 'B'): string => {
    return lookup?.getTeamName?.(side) || `Team ${side}`;
  };

  let pointEventIndex = 0;

  for (const ev of events) {
    if ((ev as any).type === 'UNDO') {
      // Replay is handled by passing the non-undone events slice.
      continue;
    }

    if (ev.type === 'PLAYER_ACTION') {
      pointEventIndex++;
      const pId = ev.playerId;
      const act = ev.action;
      const side = ev.side;
      const winnerSide = ev.resultingWinnerSide;
      const pName = getPName(pId);
      const isPoint = act === 'POINT';
      const isDrop = act === 'DROP';

      const player = getPlayer(pId);

      // 1. Strict Mode Handling: if strict, any rally won by another player breaks this player's point streak
      if (cfg.strictMode) {
        for (const otherId of Object.keys(playerStreaks)) {
          if (otherId !== pId) {
            playerStreaks[otherId]!.currentPointStreak = 0;
            firedPointMilestones[otherId]?.clear();
          }
        }
      }

      if (isPoint) {
        // Break drop streak
        player.currentDropStreak = 0;
        firedDropMilestones[pId]?.clear();

        // Increment point streak
        player.currentPointStreak += 1;
        if (player.currentPointStreak > player.bestPointStreak) {
          player.bestPointStreak = player.currentPointStreak;
        }

        // Check point milestone
        const count = player.currentPointStreak;
        if (pointThresholds.has(count) && !firedPointMilestones[pId]!.has(count)) {
          firedPointMilestones[pId]!.add(count);
          let key: keyof (typeof STREAK_LOCALIZATIONS)['en'] = 'pointGeneric';
          if (count === 3) key = 'point3';
          else if (count === 5) key = 'point5';
          else if (count === 7) key = 'point7';
          else if (count === 10) key = 'point10';

          const alert: StreakMilestoneAlert = {
            id: `${ev.matchId || 'm'}-${pointEventIndex}-point-${pId}-${count}`,
            type: 'PLAYER_POINT',
            playerId: pId,
            playerName: pName,
            side,
            count,
            message: formatStreakMessage(key, cfg.language, { name: pName, count }),
            priority: count,
            timestamp: typeof ev.occurredAt === 'number' ? ev.occurredAt : Date.now(),
          };
          milestoneHistory.push(alert);
          currentMilestone = alert;
        }
      } else if (isDrop) {
        // Check streak snapped alert if previously had a streak
        if (cfg.streakSnappedEnabled && player.currentPointStreak >= 3) {
          const snapped = player.currentPointStreak;
          const alert: StreakMilestoneAlert = {
            id: `${ev.matchId || 'm'}-${pointEventIndex}-snapped-${pId}-${snapped}`,
            type: 'STREAK_SNAPPED',
            playerId: pId,
            playerName: pName,
            side,
            count: 0,
            snappedCount: snapped,
            message: formatStreakMessage('streakSnapped', cfg.language, { name: pName, count: snapped }),
            priority: 1,
            timestamp: typeof ev.occurredAt === 'number' ? ev.occurredAt : Date.now(),
          };
          milestoneHistory.push(alert);
          currentMilestone = alert;
        }

        // Break point streak
        player.currentPointStreak = 0;
        firedPointMilestones[pId]?.clear();

        // Increment drop streak
        if (cfg.dropStreaksEnabled) {
          player.currentDropStreak += 1;
          if (player.currentDropStreak > player.longestDropStreak) {
            player.longestDropStreak = player.currentDropStreak;
          }

          const count = player.currentDropStreak;
          if (dropThresholds.has(count) && !firedDropMilestones[pId]!.has(count)) {
            firedDropMilestones[pId]!.add(count);
            let key: keyof (typeof STREAK_LOCALIZATIONS)['en'] = 'dropGeneric';
            if (count === 3) key = 'drop3';
            else if (count === 5) key = 'drop5';

            const alert: StreakMilestoneAlert = {
              id: `${ev.matchId || 'm'}-${pointEventIndex}-drop-${pId}-${count}`,
              type: 'PLAYER_DROP',
              playerId: pId,
              playerName: pName,
              side,
              count,
              message: formatStreakMessage(key, cfg.language, { name: pName, count }),
              priority: count,
              timestamp: typeof ev.occurredAt === 'number' ? ev.occurredAt : Date.now(),
            };
            milestoneHistory.push(alert);
            currentMilestone = alert;
          }
        }
      }

      // 2. Team Run Processing
      // In Service Point: side-outs (where isPoint is false) do not award points, so no run increment or reset.
      // A run increments ONLY when points are scored.
      if (ev.isPoint !== false) {
        const scoringSide = winnerSide;
        const opponentSide = scoringSide === 'A' ? 'B' : 'A';

        // Increment scoring side run
        teamRuns[scoringSide] += 1;
        if (teamRuns[scoringSide] > bestTeamRuns[scoringSide]) {
          bestTeamRuns[scoringSide] = teamRuns[scoringSide];
        }

        // Reset opponent side run & milestones
        teamRuns[opponentSide] = 0;
        firedTeamRunMilestones[opponentSide].clear();

        // Check team run milestone
        const runCount = teamRuns[scoringSide];
        if (runThresholds.has(runCount) && !firedTeamRunMilestones[scoringSide].has(runCount)) {
          firedTeamRunMilestones[scoringSide].add(runCount);
          const tName = getTName(scoringSide);
          let key: keyof (typeof STREAK_LOCALIZATIONS)['en'] = 'teamRunGeneric';
          if (runCount === 5) key = 'teamRun5';
          else if (runCount === 8) key = 'teamRun8';
          else if (runCount === 10) key = 'teamRun10';

          const alert: StreakMilestoneAlert = {
            id: `${ev.matchId || 'm'}-${pointEventIndex}-run-${scoringSide}-${runCount}`,
            type: 'TEAM_RUN',
            side: scoringSide,
            teamName: tName,
            count: runCount,
            message: formatStreakMessage(key, cfg.language, { team: tName, count: runCount }),
            priority: runCount,
            timestamp: typeof ev.occurredAt === 'number' ? ev.occurredAt : Date.now(),
          };
          milestoneHistory.push(alert);
          currentMilestone = alert;
        }
      }
    } else if (ev.type === 'POINT_SCORED' || ev.type === 'RALLY_WON') {
      pointEventIndex++;
      const isRallyPoint = ev.type === 'POINT_SCORED' ? true : ev.isPoint;
      if (!isRallyPoint) {
        // e.g. In Service point, side-out rally won without a point being scored
        continue;
      }
      const winnerSide: 'A' | 'B' = ev.type === 'POINT_SCORED' ? ev.side : ev.winningSide;
      const opponentSide: 'A' | 'B' = winnerSide === 'A' ? 'B' : 'A';

      teamRuns[winnerSide] += 1;
      if (teamRuns[winnerSide] > bestTeamRuns[winnerSide]) {
        bestTeamRuns[winnerSide] = teamRuns[winnerSide];
      }

      teamRuns[opponentSide] = 0;
      firedTeamRunMilestones[opponentSide].clear();

      const runCount = teamRuns[winnerSide];
      if (runThresholds.has(runCount) && !firedTeamRunMilestones[winnerSide].has(runCount)) {
        firedTeamRunMilestones[winnerSide].add(runCount);
        const tName = getTName(winnerSide);
        let key: keyof (typeof STREAK_LOCALIZATIONS)['en'] = 'teamRunGeneric';
        if (runCount === 5) key = 'teamRun5';
        else if (runCount === 8) key = 'teamRun8';
        else if (runCount === 10) key = 'teamRun10';

        const alert: StreakMilestoneAlert = {
          id: `${(ev as any).matchId || 'm'}-${pointEventIndex}-run-${winnerSide}-${runCount}`,
          type: 'TEAM_RUN',
          side: winnerSide,
          teamName: tName,
          count: runCount,
          message: formatStreakMessage(key, cfg.language, { team: tName, count: runCount }),
          priority: runCount,
          timestamp: typeof (ev as any).occurredAt === 'number' ? (ev as any).occurredAt : ev.timestamp || Date.now(),
        };
        milestoneHistory.push(alert);
        currentMilestone = alert;
      }
    }
  }

  return {
    playerStreaks,
    teamRuns,
    bestTeamRuns,
    currentMilestone,
    milestoneHistory,
  };
}
