import type {
  RankingMatchEvent,
  RankingConfig,
  PlayerMvpContribution,
  MatchAwardsResult,
  MvpWeights,
} from './types.js';
import { DEFAULT_MVP_WEIGHTS } from './types.js';

export interface MatchAwardMeta {
  matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED';
  scoringFormat?: string;
  targetPoints?: number;
  winnerSide?: 'A' | 'B';
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

  const isServicePoint =
    meta?.scoringFormat?.startsWith('SERVICE') ?? false;
  const isSingles =
    meta?.matchType === 'SINGLES' ||
    (meta?.participants && meta.participants.length <= 2);
  const targetPoints = meta?.targetPoints || (isServicePoint ? 15 : 21);
  const clutchThreshold = Math.max(1, targetPoints - 5);
  const winnerSide = meta?.winnerSide;

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

  // Pre-populate known participants if available
  if (meta?.participants) {
    for (const p of meta.participants) {
      getOrCreatePlayer(p.playerId, p.side);
    }
  }

  // State tracking during replay
  let scoreA = 0;
  let scoreB = 0;
  let currentGame = 1;
  let servingSide: 'A' | 'B' = 'A';
  let isSettingActive = false;
  const totalGames = meta?.bestOf || 3;

  for (const ev of events) {
    if (ev.eventType === 'GAME_END') {
      currentGame = (ev as any).gameNumber ? (ev as any).gameNumber + 1 : currentGame + 1;
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
      servingSide = (ev as any).newServingSide || (servingSide === 'A' ? 'B' : 'A');
      continue;
    }

    if (ev.eventType === 'PLAYER_ACTION') {
      const pId = ev.playerId;
      if (!pId) continue;

      const act = ev.action;
      const playerSide = (ev.side as 'A' | 'B') || 'A';
      const player = getOrCreatePlayer(pId, playerSide);

      // Determine serving side at start of rally
      const serverSideAtRally: 'A' | 'B' =
        (ev as any).servingSideAtRally ||
        (ev as any).serverSide ||
        (ev.payload && ((ev.payload as any).servingSideAtRally || (ev.payload as any).serverSide)) ||
        servingSide;

      const isReceiving = serverSideAtRally !== playerSide;
      const isDecidingGame = currentGame === totalGames;

      // Clutch condition: score >= target - 5, setting active, or deciding game end
      const isClutch =
        scoreA >= clutchThreshold ||
        scoreB >= clutchThreshold ||
        isSettingActive ||
        (isDecidingGame && (scoreA >= clutchThreshold || scoreB >= clutchThreshold));

      // Comeback condition: trailing by 4 or more points before this rally
      const deficit =
        playerSide === 'A' ? scoreB - scoreA : scoreA - scoreB;
      const isComeback = deficit >= 4;

      if (act === 'POINT') {
        player.pointsWon += 1;
        player.currentStreak += 1;
        if (player.currentStreak > player.bestPointStreak) {
          player.bestPointStreak = player.currentStreak;
        }

        // Serve regained: POINT action as receiver
        if (isReceiving) {
          player.serveRegained += 1;
        }

        if (isClutch) {
          player.clutchPoints += 1;
        }

        if (isComeback) {
          player.comebackPoints += 1;
        }

        // Update score & serving side if point awarded
        if (ev.isPoint !== false) {
          const winningSide = (ev as any).resultingWinnerSide || playerSide;
          if (winningSide === 'A') scoreA++;
          else scoreB++;
          servingSide = winningSide;
        } else if (ev.isSideOut) {
          servingSide = servingSide === 'A' ? 'B' : 'A';
        }
      } else if (act === 'DROP') {
        player.drops += 1;
        player.currentStreak = 0; // Drop breaks point streak

        if (isClutch) {
          player.clutchDrops += 1;
        }

        // Drop confers point or side-out to opponent
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

  // Calculate final MVP metrics for each player
  const serveMultiplier = isServicePoint
    ? weights.servicePointServeRegainMultiplier
    : weights.rallyPointServeRegainMultiplier;

  const allContributions: PlayerMvpContribution[] = Object.values(playerMap).map((p) => {
    const isWinner = winnerSide ? p.teamSide === winnerSide : false;
    const streakBonusPoints = Math.max(0, p.bestPointStreak - 2);
    const totalAttributedActions = p.pointsWon + p.drops;
    const isQualified = totalAttributedActions >= weights.qualificationMinActions;

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

    // Reason chips
    const reasonChips: string[] = [];
    if (p.pointsWon > 0) reasonChips.push(`${p.pointsWon} points`);
    if (p.serveRegained > 0) reasonChips.push(`${p.serveRegained} serve regains`);
    if (p.clutchPoints > 0) reasonChips.push(`${p.clutchPoints} clutch points`);
    if (p.comebackPoints > 0) reasonChips.push(`${p.comebackPoints} comeback pts`);
    if (p.bestPointStreak >= 3) reasonChips.push(`Best streak: ${p.bestPointStreak}`);

    // One-line summary
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

  // Check overall qualification
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
    };
  }

  // Tie-breaker sorter:
  // 1. MVP score descending
  // 2. Fewer drops (drops ascending)
  // 3. More serve regained descending
  // 4. More clutch points descending
  // 5. Winning side
  const comparePlayers = (a: PlayerMvpContribution, b: PlayerMvpContribution): number => {
    if (b.mvpScore !== a.mvpScore) return b.mvpScore - a.mvpScore;
    if (a.drops !== b.drops) return a.drops - b.drops;
    if (b.serveRegained !== a.serveRegained) return b.serveRegained - a.serveRegained;
    if (b.clutchPoints !== a.clutchPoints) return b.clutchPoints - a.clutchPoints;
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    return 0;
  };

  const sortedCandidates = [...qualifiedPlayers].sort(comparePlayers);

  // Singles special handling: default to winner if singlesMvpEnabled is false
  let topCandidate = sortedCandidates[0]!;
  if (isSingles && !weights.singlesMvpEnabled && winnerSide) {
    const winnerPlayer = qualifiedPlayers.find((p) => p.isWinner);
    if (winnerPlayer) {
      topCandidate = winnerPlayer;
    }
  }

  // Check co-MVPs: exact tie on all 5 tiebreaker criteria
  const coMvps = qualifiedPlayers.filter(
    (p) => comparePlayers(p, topCandidate) === 0
  );

  // Fighter award: best performer on the losing side
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
  };
}
