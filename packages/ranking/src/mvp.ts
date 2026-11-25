import type {
  RankingMatchEvent,
  RankingConfig,
  PlayerMvpContribution,
  MatchAwardsResult,
  MvpWeights,
} from './types.js';
import { DEFAULT_MVP_WEIGHTS } from './types.js';
import { replayValidEvents } from './stats.js';

export interface MatchAwardMeta {
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED';
  scoringFormat?: string;
  targetPoints?: number;
  winnerSide?: 'A' | 'B';
  status?: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'RETIRED' | 'WALKOVER';
  isShutout?: boolean;
  participants?: Array<{
    playerId: string;
    displayName: string;
    side: 'A' | 'B';
  }>;
  bestOf?: number;
}

/**
 * Pure, deterministic function to compute Match MVP, Fighter award,
 * reason chips, and performance metrics from the event log.
 */
export function computeMatchAwards(
  events: RankingMatchEvent[],
  config?: Partial<RankingConfig>,
  meta?: MatchAwardMeta
): MatchAwardsResult {
  const weights: MvpWeights = {
    ...DEFAULT_MVP_WEIGHTS,
    ...(config?.mvpWeights || {}),
  };

  // Sort deterministically & strip undone/compensated events
  const validEvents = replayValidEvents(events);

  // Walkover matches never award an MVP
  if (
    meta?.status === 'WALKOVER' ||
    validEvents.some((ev) => ev.eventType === 'WALKOVER')
  ) {
    return {
      mvp: null,
      fighter: null,
      coMvps: [],
      allContributions: [],
      isQualified: false,
      disqualificationReason: 'MVP not available for walkover matches',
      formulaVersion: weights.formulaVersion,
      unassignedCount: 0,
    };
  }

  const isServicePoint =
    meta?.scoringFormat?.startsWith('SERVICE') ?? false;
  const isSingles =
    meta?.matchType === 'SINGLES' ||
    (meta?.participants && meta.participants.length <= 2);
  const targetPoints = meta?.targetPoints || (isServicePoint ? 15 : 21);
  const clutchThreshold = Math.max(1, targetPoints - 5);
  const winnerSide = meta?.winnerSide;

  // Detect shutout games (either from meta or GAME_END reason/score)
  const shutoutGameNumbers = new Set<number>();
  let currentScanGame = 1;
  for (const ev of validEvents) {
    if (ev.eventType === 'GAME_END') {
      const gNum = (ev as unknown as { gameNumber?: number }).gameNumber ?? currentScanGame;
      const reason =
        (ev as unknown as { reason?: string }).reason ??
        (ev.payload?.reason as string | undefined);
      if (reason === 'SHUTOUT') {
        shutoutGameNumbers.add(gNum);
      }
      currentScanGame = gNum + 1;
    }
  }
  const isShutoutMatch = Boolean(meta?.isShutout || shutoutGameNumbers.size > 0);

  // Initialize player contribution records
  const playerMap: Record<
    string,
    {
      playerId: string;
      name: string;
      teamSide: 'A' | 'B';
      pointsWon: number;
      serveRegained: number;
      clutchPoints: number;
      comebackPoints: number;
      drops: number;
      clutchDrops: number;
      currentStreak: number;
      bestPointStreak: number;
    }
  > = {};

  const getOrCreatePlayer = (pId: string, side: 'A' | 'B') => {
    if (!playerMap[pId]) {
      const part = meta?.participants?.find((p) => p.playerId === pId);
      playerMap[pId] = {
        playerId: pId,
        name: part?.displayName || pId,
        teamSide: side || part?.side || 'A',
        pointsWon: 0,
        serveRegained: 0,
        clutchPoints: 0,
        comebackPoints: 0,
        drops: 0,
        clutchDrops: 0,
        currentStreak: 0,
        bestPointStreak: 0,
      };
    }
    return playerMap[pId]!;
  };

  if (meta?.participants) {
    for (const p of meta.participants) {
      getOrCreatePlayer(p.playerId, p.side);
    }
  }

  let scoreA = 0;
  let scoreB = 0;
  let currentGame = 1;
  let servingSide: 'A' | 'B' = 'A';
  let isSettingActive = false;
  let unassignedCount = 0;
  const totalGames = meta?.bestOf || 3;

  for (const ev of validEvents) {
    if (ev.eventType === 'GAME_END') {
      const gNum = (ev as unknown as { gameNumber?: number }).gameNumber;
      currentGame = gNum ? gNum + 1 : currentGame + 1;
      scoreA = 0;
      scoreB = 0;
      isSettingActive = false;
      continue;
    }

    if (ev.eventType === 'SETTING_CHOICE') {
      isSettingActive = true;
      continue;
    }

    if (ev.eventType === 'SIDE_OUT') {
      servingSide =
        (ev as unknown as { newServingSide?: 'A' | 'B' }).newServingSide ||
        (servingSide === 'A' ? 'B' : 'A');
      continue;
    }

    if (ev.eventType === 'POINT' || ev.eventType === 'RALLY_WON') {
      const pId = ev.pointWinnerPlayerId || ev.playerId;
      const errId = ev.errorPlayerId;
      if (!pId && !errId) {
        unassignedCount += 1;
      }
      if (ev.isPoint !== false) {
        if (ev.side === 'A') scoreA++;
        else if (ev.side === 'B') scoreB++;
      }
      continue;
    }

    if (ev.eventType === 'PLAYER_ACTION') {
      const pId = ev.playerId;
      if (!pId) {
        unassignedCount += 1;
        continue;
      }

      const act = ev.action;
      const playerSide = (ev.side as 'A' | 'B') || 'A';
      const player = getOrCreatePlayer(pId, playerSide);

      const serverSideAtRally: 'A' | 'B' =
        (ev as unknown as { servingSideAtRally?: 'A' | 'B'; serverSide?: 'A' | 'B' })
          .servingSideAtRally ||
        (ev as unknown as { serverSide?: 'A' | 'B' }).serverSide ||
        (ev.payload &&
          ((ev.payload.servingSideAtRally as 'A' | 'B' | undefined) ||
            (ev.payload.serverSide as 'A' | 'B' | undefined))) ||
        servingSide;

      const isReceiving = serverSideAtRally !== playerSide;
      const isDecidingGame = currentGame === totalGames;
      const inShutoutGame = Boolean(meta?.isShutout || shutoutGameNumbers.has(currentGame));

      // Clutch is not applicable in shutout games
      const isClutch =
        !inShutoutGame &&
        (scoreA >= clutchThreshold ||
          scoreB >= clutchThreshold ||
          isSettingActive ||
          (isDecidingGame && (scoreA >= clutchThreshold || scoreB >= clutchThreshold)));

      const deficit = playerSide === 'A' ? scoreB - scoreA : scoreA - scoreB;
      const isComeback = deficit >= 4;

      if (act === 'POINT') {
        player.pointsWon += 1;
        player.currentStreak += 1;
        if (player.currentStreak > player.bestPointStreak) {
          player.bestPointStreak = player.currentStreak;
        }

        if (isReceiving) {
          player.serveRegained += 1;
        }

        if (isClutch) {
          player.clutchPoints += 1;
        }

        if (isComeback) {
          player.comebackPoints += 1;
        }

        // Opposing drop attribution (single or Both Fault 0.5 each)
        if (ev.attributedDropPlayerIds && ev.attributedDropPlayerIds.length > 0) {
          const share = Number((1 / ev.attributedDropPlayerIds.length).toFixed(2));
          const oppSide: 'A' | 'B' = playerSide === 'A' ? 'B' : 'A';
          for (const dId of ev.attributedDropPlayerIds) {
            const dPlayer = getOrCreatePlayer(dId, oppSide);
            dPlayer.drops = Number((dPlayer.drops + share).toFixed(2));
            dPlayer.currentStreak = 0;
            if (isClutch) {
              dPlayer.clutchDrops = Number((dPlayer.clutchDrops + share).toFixed(2));
            }
          }
        }

        if (ev.isPoint !== false) {
          const winningSide =
            (ev as unknown as { resultingWinnerSide?: 'A' | 'B' }).resultingWinnerSide ||
            playerSide;
          if (winningSide === 'A') scoreA++;
          else scoreB++;
          servingSide = winningSide;
        } else if (ev.isSideOut) {
          servingSide = servingSide === 'A' ? 'B' : 'A';
        }
      } else if (act === 'DROP') {
        if (ev.isBothFault && ev.attributedDropPlayerIds && ev.attributedDropPlayerIds.length > 1) {
          const share = Number((1 / ev.attributedDropPlayerIds.length).toFixed(2));
          for (const dId of ev.attributedDropPlayerIds) {
            const dPlayer = getOrCreatePlayer(dId, playerSide);
            dPlayer.drops = Number((dPlayer.drops + share).toFixed(2));
            dPlayer.currentStreak = 0;
            if (isClutch) {
              dPlayer.clutchDrops = Number((dPlayer.clutchDrops + share).toFixed(2));
            }
          }
        } else {
          player.drops = Number((player.drops + 1).toFixed(2));
          player.currentStreak = 0;
          if (isClutch) {
            player.clutchDrops += 1;
          }
        }

        if (ev.attributedPointPlayerId) {
          const oppSide: 'A' | 'B' = playerSide === 'A' ? 'B' : 'A';
          const wPlayer = getOrCreatePlayer(ev.attributedPointPlayerId, oppSide);
          wPlayer.pointsWon += 1;
          wPlayer.currentStreak += 1;
          if (wPlayer.currentStreak > wPlayer.bestPointStreak) {
            wPlayer.bestPointStreak = wPlayer.currentStreak;
          }
          if (isClutch) wPlayer.clutchPoints += 1;
        }

        if (ev.isPoint !== false) {
          const winningSide = playerSide === 'A' ? 'B' : 'A';
          if (winningSide === 'A') scoreA++;
          else scoreB++;
          servingSide = winningSide;
        } else if (ev.isSideOut) {
          servingSide = servingSide === 'A' ? 'B' : 'A';
        }
      }
    }
  }

  // Relative qualification for shortened/shutout games: min(5, 40% of avg actions, never fewer than 2)
  const rawPlayers = Object.values(playerMap);
  const totalActionsAll = rawPlayers.reduce((sum, p) => sum + p.pointsWon + p.drops, 0);
  const avgActions = rawPlayers.length > 0 ? totalActionsAll / rawPlayers.length : 0;
  const isShortenedGame = isShutoutMatch || targetPoints <= 15;
  const qualificationThreshold = isShortenedGame
    ? Math.max(2, Math.min(weights.qualificationMinActions, Math.floor(avgActions * 0.4)))
    : weights.qualificationMinActions;

  const serveMultiplier = isServicePoint
    ? weights.servicePointServeRegainMultiplier
    : weights.rallyPointServeRegainMultiplier;

  const allContributions: PlayerMvpContribution[] = rawPlayers.map((p) => {
    const isWinner = winnerSide ? p.teamSide === winnerSide : false;
    const streakBonusPoints = Math.max(0, p.bestPointStreak - 2);
    const totalAttributedActions = p.pointsWon + p.drops;
    const isQualified = totalAttributedActions >= qualificationThreshold;

    const rawScore =
      weights.pointsWonWeight * p.pointsWon +
      weights.serveRegainedWeight * p.serveRegained * serveMultiplier +
      weights.clutchPointsWeight * p.clutchPoints +
      weights.comebackPointsWeight * p.comebackPoints +
      weights.streakBonusWeight * streakBonusPoints -
      weights.dropsPenalty * p.drops -
      weights.clutchDropsPenalty * p.clutchDrops +
      (isWinner ? weights.resultBonus : 0);

    const mvpScore = Math.round(rawScore * 10) / 10;

    const reasonChips: string[] = [];
    if (p.pointsWon > 0) reasonChips.push(`${p.pointsWon} points`);
    if (p.serveRegained > 0) reasonChips.push(`${p.serveRegained} serve regains`);
    if (p.clutchPoints > 0) reasonChips.push(`${p.clutchPoints} clutch points`);
    if (p.comebackPoints > 0) reasonChips.push(`${p.comebackPoints} comeback pts`);
    if (p.bestPointStreak >= 3) reasonChips.push(`Best streak: ${p.bestPointStreak}`);

    let summaryLine = `${p.name} scored ${p.pointsWon} points with ${p.drops} drops.`;
    if (p.pointsWon > 0 || p.serveRegained > 0) {
      const highlights: string[] = [];
      if (p.serveRegained > 0) highlights.push(`${p.serveRegained} serve regains`);
      if (p.clutchPoints > 0) highlights.push(`${p.clutchPoints} clutch points`);
      if (p.comebackPoints > 0) highlights.push(`${p.comebackPoints} comeback points`);

      if (highlights.length > 0) {
        summaryLine = `${p.name} ${isWinner ? 'led the team with' : 'battled hard with'} ${highlights.join(' and ')}.`;
      } else {
        summaryLine = `${p.name} contributed ${p.pointsWon} points with strong court presence.`;
      }
    }

    return {
      playerId: p.playerId,
      name: p.name,
      teamSide: p.teamSide,
      isWinner,
      pointsWon: p.pointsWon,
      serveRegained: p.serveRegained,
      clutchPoints: p.clutchPoints,
      comebackPoints: p.comebackPoints,
      streakBonusPoints,
      drops: p.drops,
      clutchDrops: p.clutchDrops,
      bestPointStreak: p.bestPointStreak,
      totalAttributedActions,
      isQualified,
      mvpScore,
      reasonChips,
      summaryLine,
    };
  });

  const qualifiedPlayers = allContributions.filter((p) => p.isQualified);
  if (qualifiedPlayers.length === 0) {
    return {
      mvp: null,
      fighter: null,
      coMvps: [],
      allContributions,
      isQualified: false,
      disqualificationReason: 'MVP not available (not enough player data)',
      formulaVersion: weights.formulaVersion,
      unassignedCount,
      qualificationThreshold,
      isShutoutMatch,
    };
  }

  const comparePlayers = (a: PlayerMvpContribution, b: PlayerMvpContribution): number => {
    if (b.mvpScore !== a.mvpScore) return b.mvpScore - a.mvpScore;
    if (a.drops !== b.drops) return a.drops - b.drops;
    if (b.serveRegained !== a.serveRegained) return b.serveRegained - a.serveRegained;
    if (b.clutchPoints !== a.clutchPoints) return b.clutchPoints - a.clutchPoints;
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    return 0;
  };

  const sortedCandidates = [...qualifiedPlayers].sort(comparePlayers);

  let topCandidate = sortedCandidates[0]!;
  if (isSingles && !weights.singlesMvpEnabled && winnerSide) {
    const winnerPlayer = qualifiedPlayers.find((p) => p.isWinner);
    if (winnerPlayer) {
      topCandidate = winnerPlayer;
    }
  }

  const coMvps = qualifiedPlayers.filter(
    (p) => comparePlayers(p, topCandidate) === 0
  );

  const losingCandidates = (
    qualifiedPlayers.filter((p) => !p.isWinner).length > 0
      ? qualifiedPlayers.filter((p) => !p.isWinner)
      : allContributions.filter((p) => !p.isWinner)
  ).sort(comparePlayers);

  const fighter = losingCandidates.length > 0 ? losingCandidates[0]! : null;

  return {
    mvp: topCandidate,
    fighter,
    coMvps,
    allContributions,
    isQualified: true,
    formulaVersion: weights.formulaVersion,
    unassignedCount,
    qualificationThreshold,
    isShutoutMatch,
  };
}
