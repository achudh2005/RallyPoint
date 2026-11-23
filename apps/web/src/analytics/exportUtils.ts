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
    ],
  ];

  let seq = 0;
  let game = 1;
  let scoreA = 0;
  let scoreB = 0;

  for (const event of events) {
    if (event.type === 'POINT' || event.type === 'SERVE_FAULT') {
      seq++;
      const winnerSide =
        event.type === 'POINT'
          ? event.side
          : event.faultySide === 'A'
            ? 'B'
            : 'A';
      if (winnerSide === 'A') scoreA++;
      else scoreB++;

      const winnerName =
        winnerSide === 'A' ? state.config.sideA.name : state.config.sideB.name;
      const tag = event.type === 'POINT' ? (event.rallyEndType ?? 'NONE') : 'SERVICE_FAULT';

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
