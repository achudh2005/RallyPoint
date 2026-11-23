import {
  DoublesPositions,
  MatchConfig,
  MatchMode,
  ServeState,
  ServiceCourt,
  Side,
} from './types.js';

export function initializeDoublesPositions(
  config: MatchConfig,
  serverSide: Side,
  serverPlayerId: string,
  receiverPlayerId?: string
): DoublesPositions {
  const sideAPlayers = config.sideA.playerIds;
  const sideBPlayers = config.sideB.playerIds;

  const aP1 = sideAPlayers[0] ?? 'A1';
  const aP2 = sideAPlayers[1] ?? 'A2';
  const bP1 = sideBPlayers[0] ?? 'B1';
  const bP2 = sideBPlayers[1] ?? 'B2';

  if (serverSide === 'A') {
    const sP = serverPlayerId;
    const partner = sP === aP1 ? aP2 : aP1;
    const rP = receiverPlayerId ?? bP1;
    const rPartner = rP === bP1 ? bP2 : bP1;

    return {
      sideA: {
        rightPlayerId: sP,
        leftPlayerId: partner,
      },
      sideB: {
        rightPlayerId: rP,
        leftPlayerId: rPartner,
      },
    };
  } else {
    const sP = serverPlayerId;
    const partner = sP === bP1 ? bP2 : bP1;
    const rP = receiverPlayerId ?? aP1;
    const rPartner = rP === aP1 ? aP2 : aP1;

    return {
      sideA: {
        rightPlayerId: rP,
        leftPlayerId: rPartner,
      },
      sideB: {
        rightPlayerId: sP,
        leftPlayerId: partner,
      },
    };
  }
}

export function computeNextServeState(
  mode: MatchMode,
  currentServeState: ServeState,
  winnerSide: Side,
  scoreA: number,
  scoreB: number,
  doublesPositions?: DoublesPositions
): { nextServeState: ServeState; nextPositions?: DoublesPositions } {
  if (mode === 'singles') {
    const serverSide = winnerSide;
    const serverScore = serverSide === 'A' ? scoreA : scoreB;
    const isEven = serverScore % 2 === 0;
    const court: ServiceCourt = isEven ? 'right' : 'left';

    const serverPlayerId =
      serverSide === 'A'
        ? currentServeState.serverSide === 'A'
          ? currentServeState.serverPlayerId
          : currentServeState.receiverPlayerId
        : currentServeState.serverSide === 'B'
          ? currentServeState.serverPlayerId
          : currentServeState.receiverPlayerId;

    const receiverSide: Side = serverSide === 'A' ? 'B' : 'A';
    const receiverPlayerId =
      receiverSide === 'A'
        ? currentServeState.serverSide === 'A'
          ? currentServeState.serverPlayerId
          : currentServeState.receiverPlayerId
        : currentServeState.serverSide === 'B'
          ? currentServeState.serverPlayerId
          : currentServeState.receiverPlayerId;

    return {
      nextServeState: {
        serverSide,
        serverPlayerId,
        receiverSide,
        receiverPlayerId,
        serviceCourt: court,
        receiverCourt: court,
      },
    };
  }

  // Doubles BWF rules
  if (!doublesPositions) {
    throw new Error('Doubles positions required for doubles match');
  }

  const prevServerSide = currentServeState.serverSide;
  const isServerWin = winnerSide === prevServerSide;

  if (isServerWin) {
    // Serving side won rally:
    // 1. Serving side players swap service courts
    // 2. Receiving side players stay in place
    // 3. Same server serves from the new court
    const currentPositions =
      prevServerSide === 'A' ? doublesPositions.sideA : doublesPositions.sideB;
    const swappedServingPositions = {
      rightPlayerId: currentPositions.leftPlayerId,
      leftPlayerId: currentPositions.rightPlayerId,
    };

    const nextPositions: DoublesPositions =
      prevServerSide === 'A'
        ? {
            sideA: swappedServingPositions,
            sideB: { ...doublesPositions.sideB },
          }
        : {
            sideA: { ...doublesPositions.sideA },
            sideB: swappedServingPositions,
          };

    const serverPlayerId = currentServeState.serverPlayerId;
    const serverSide = prevServerSide;
    const serverScore = serverSide === 'A' ? scoreA : scoreB;
    const isEven = serverScore % 2 === 0;
    const serviceCourt: ServiceCourt = isEven ? 'right' : 'left';

    const receivingPositions =
      serverSide === 'A' ? nextPositions.sideB : nextPositions.sideA;
    const receiverPlayerId =
      serviceCourt === 'right'
        ? receivingPositions.rightPlayerId
        : receivingPositions.leftPlayerId;

    return {
      nextServeState: {
        serverSide,
        serverPlayerId,
        receiverSide: serverSide === 'A' ? 'B' : 'A',
        receiverPlayerId,
        serviceCourt,
        receiverCourt: serviceCourt,
      },
      nextPositions,
    };
  } else {
    // Receiving side won rally (side out):
    // 1. Neither side changes service courts!
    // 2. New serving side is winnerSide
    // 3. Server is the player currently in right court (if score is even) or left court (if score is odd)
    const serverSide = winnerSide;
    const serverScore = serverSide === 'A' ? scoreA : scoreB;
    const isEven = serverScore % 2 === 0;
    const serviceCourt: ServiceCourt = isEven ? 'right' : 'left';

    const newServingPositions =
      serverSide === 'A' ? doublesPositions.sideA : doublesPositions.sideB;
    const serverPlayerId =
      serviceCourt === 'right'
        ? newServingPositions.rightPlayerId
        : newServingPositions.leftPlayerId;

    const receivingPositions =
      serverSide === 'A' ? doublesPositions.sideB : doublesPositions.sideA;
    const receiverPlayerId =
      serviceCourt === 'right'
        ? receivingPositions.rightPlayerId
        : receivingPositions.leftPlayerId;

    return {
      nextServeState: {
        serverSide,
        serverPlayerId,
        receiverSide: serverSide === 'A' ? 'B' : 'A',
        receiverPlayerId,
        serviceCourt,
        receiverCourt: serviceCourt,
      },
      nextPositions: {
        sideA: { ...doublesPositions.sideA },
        sideB: { ...doublesPositions.sideB },
      },
    };
  }
}
