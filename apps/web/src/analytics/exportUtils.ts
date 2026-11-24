import type { MatchEvent, MatchState } from '@rallypoint/engine';
import { toPng } from 'html-to-image';

export function exportMatchCSV(state: MatchState, events: MatchEvent[]): void {
  const rows: string[][] = [
    [
      'Sequence',
      'Timestamp',
      'Event_Type',
      'Game_Number',
      'Side_A_Score',
      'Side_B_Score',
      'Winner_Side',
      'Winner_Name',
      'Rally_End_Tag',
      'Server_Side',
      'Service_Court',
      'Player_Id',
      'Points_Won',
      'Drops',
      'Net_Contribution',
    ],
  ];

  let seq = 0;
  let game = 1;
  let scoreA = 0;
  let scoreB = 0;

  for (const event of events) {
    if (
      event.type === 'POINT' ||
      event.type === 'SERVE_FAULT' ||
      event.type === 'PLAYER_ACTION'
    ) {
      seq++;
      let winnerSide: 'A' | 'B';
      let actionType = 'POINT';
      let playerId = '';
      let ptsWon = 0;
      let drps = 0;

      if (event.type === 'PLAYER_ACTION') {
        const pa = event as any;
        winnerSide =
          pa.resultingWinnerSide ||
          (pa.action === 'POINT' ? pa.side : pa.side === 'A' ? 'B' : 'A');
        actionType = pa.action;
        playerId = pa.playerId || '';
        if (pa.action === 'POINT') {
          ptsWon = 1;
        } else {
          drps = 1;
        }
      } else if (event.type === 'POINT') {
        winnerSide = event.side;
        ptsWon = 1;
      } else {
        winnerSide = event.faultySide === 'A' ? 'B' : 'A';
        drps = 1;
      }

      if (winnerSide === 'A') scoreA++;
      else scoreB++;

      const winnerName =
        winnerSide === 'A' ? state.config.sideA.name : state.config.sideB.name;
      const tag = (event as any).rallyEndType ?? actionType;

      rows.push([
        seq.toString(),
        new Date(event.timestamp).toISOString(),
        event.type,
        game.toString(),
        scoreA.toString(),
        scoreB.toString(),
        winnerSide,
        `"${winnerName.replace(/"/g, '""')}"`,
        tag,
        state.serveState.serverSide,
        state.serveState.serviceCourt,
        playerId,
        ptsWon.toString(),
        drps.toString(),
        (ptsWon - drps).toString(),
      ]);
    } else if (event.type === 'GAME_END') {
      game = event.gameNumber + 1;
      scoreA = 0;
      scoreB = 0;
    }
  }

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    rows.map((row) => row.join(',')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `rallypoint_${state.config.id}_${Date.now()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportMatchJSON(state: MatchState, events: MatchEvent[]): void {
  const exportPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    matchId: state.config.id,
    config: state.config,
    finalState: {
      status: state.status,
      winnerSide: state.winnerSide,
      winReason: state.winReason,
      gamesWonA: state.gamesWonA,
      gamesWonB: state.gamesWonB,
      games: state.games,
    },
    events,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rallypoint_${state.config.id}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportScorecardPNG(
  element: HTMLElement,
  filename = 'rallypoint-scorecard.png'
): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#030712',
    });
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export scorecard PNG:', error);
  }
}

export function exportRankingsCSV(
  entries: any[],
  category = 'OVERALL',
  scoringFilter = 'ALL'
): void {
  const rows: string[][] = [
    [
      'Rank',
      'Name',
      'Matches_Played',
      'Category_Score',
      'Points_Won',
      'Drops',
      'Net_Contribution',
      'Win_Rate_Pct',
      'Category',
      'Scoring_Filter',
    ],
  ];

  entries.forEach((e, idx) => {
    const rank = e.rank || idx + 1;
    const name = `"${(e.name || '').replace(/"/g, '""')}"`;
    const matches = (e.matchesPlayed ?? e.stats?.matchesPlayed ?? 0).toString();
    const score = (e.headlineValue ?? 0).toString();
    const ptsWon = (e.stats?.pointsWon ?? e.stats?.pointsScored ?? 0).toString();
    const drops = (e.stats?.drops ?? e.stats?.pointsConceded ?? 0).toString();
    const net = (e.stats?.netContribution ?? ((e.stats?.pointsWon ?? 0) - (e.stats?.drops ?? 0))).toString();
    const winRate = (e.stats?.winRate ?? 0).toString();

    rows.push([
      rank.toString(),
      name,
      matches,
      score,
      ptsWon,
      drops,
      net,
      winRate,
      category,
      scoringFilter,
    ]);
  });

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    rows.map((row) => row.join(',')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `rallypoint_rankings_${category}_${Date.now()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

