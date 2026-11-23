import { create } from 'zustand';
import {
  applyEvent,
  createMatch,
  MatchConfig,
  MatchEvent,
  MatchState,
  RallyEndType,
  replay,
  Side,
} from '@rallypoint/engine';
import { db } from '../db/index.js';

interface MatchStore {
  match: MatchState | null;
  events: MatchEvent[];
  enableRallyTagging: boolean;
  pendingPointSide: Side | null;
  theme: 'dark' | 'light';
  largeTextMode: boolean;
  announcement: string;

  // Actions
  startMatch: (config: MatchConfig, enableRallyTagging?: boolean) => Promise<void>;
  recordPoint: (side: Side, rallyEndType?: RallyEndType) => Promise<void>;
  undo: () => Promise<void>;
  recordServeFault: (faultySide: Side) => Promise<void>;
  toggleInterval: () => Promise<void>;
  retireMatch: (retiringSide: Side, reason?: string) => Promise<void>;
  walkoverMatch: (concedingSide: Side, reason?: string) => Promise<void>;
  setPendingPointSide: (side: Side | null) => void;
  toggleTheme: () => void;
  toggleLargeText: () => void;
  resumeLastMatch: () => Promise<boolean>;
  resetMatch: () => void;
}

function triggerHaptic(duration = 40): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch {
    // Ignore in unsupported environments
  }
}

function generateAriaAnnouncement(state: MatchState): string {
  const nameA = state.config.sideA.name;
  const nameB = state.config.sideB.name;
  const scoreA = state.currentScoreA;
  const scoreB = state.currentScoreB;
  const server = state.serveState.serverSide === 'A' ? nameA : nameB;
  const court = state.serveState.serviceCourt;

  if (state.status === 'COMPLETED') {
    const winner = state.winnerSide === 'A' ? nameA : nameB;
    return `Match completed. ${winner} wins!`;
  }
  if (state.status === 'INTERVAL') {
    return `Interval. Score is ${nameA} ${scoreA}, ${nameB} ${scoreB}.`;
  }
  return `${nameA} ${scoreA}, ${nameB} ${scoreB}. ${server} serving from ${court} court.`;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  match: null,
  events: [],
  enableRallyTagging: false,
  pendingPointSide: null,
  theme: 'dark',
  largeTextMode: false,
  announcement: '',

  startMatch: async (config, enableRallyTagging = false) => {
    const state = createMatch(config);
    const announcement = generateAriaAnnouncement(state);

    set({
      match: state,
      events: [],
      enableRallyTagging,
      pendingPointSide: null,
      announcement,
    });

    await db.matches.put({
      id: config.id,
      config,
      state,
      events: [],
      updatedAt: Date.now(),
      completed: false,
    });
  },

  recordPoint: async (side, rallyEndType) => {
    const { match, events, pendingPointSide } = get();
    if (!match || match.status === 'COMPLETED') return;

    triggerHaptic(50);
    const targetSide = pendingPointSide ?? side;

    const event: MatchEvent = {
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'POINT',
      side: targetSide,
      rallyEndType,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];
    const announcement = generateAriaAnnouncement(nextState);

    set({
      match: nextState,
      events: nextEvents,
      pendingPointSide: null,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextState.status === 'COMPLETED',
    });
  },

  undo: async () => {
    const { match, events } = get();
    if (!match || events.length === 0) return;

    triggerHaptic(30);

    const undoEvent: MatchEvent = {
      id: `undo-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'UNDO',
    };

    const nextState = applyEvent(match, undoEvent);
    // Remove the last action from events list
    const nextEvents = [...events];
    for (let i = nextEvents.length - 1; i >= 0; i--) {
      const e = nextEvents[i];
      if (
        e &&
        (e.type === 'POINT' ||
          e.type === 'SERVE_FAULT' ||
          e.type === 'RETIRE' ||
          e.type === 'WALKOVER')
      ) {
        nextEvents.splice(i, 1);
        break;
      }
    }

    const announcement = `Undone. Score: ${generateAriaAnnouncement(nextState)}`;

    set({
      match: nextState,
      events: nextEvents,
      pendingPointSide: null,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextState.status === 'COMPLETED',
    });
  },

  recordServeFault: async (faultySide) => {
    const { match, events } = get();
    if (!match || match.status === 'COMPLETED') return;

    triggerHaptic(60);

    const event: MatchEvent = {
      id: `sf-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'SERVE_FAULT',
      faultySide,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];
    const announcement = `Service fault on side ${faultySide}. ${generateAriaAnnouncement(nextState)}`;

    set({
      match: nextState,
      events: nextEvents,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextState.status === 'COMPLETED',
    });
  },

  toggleInterval: async () => {
    const { match, events } = get();
    if (!match) return;

    const event: MatchEvent = {
      id: `int-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'INTERVAL',
      intervalType: 'ELEVEN_POINT',
      gameNumber: match.currentGameNumber,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];

    set({
      match: nextState,
      events: nextEvents,
      announcement: generateAriaAnnouncement(nextState),
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: false,
    });
  },

  retireMatch: async (retiringSide, reason) => {
    const { match, events } = get();
    if (!match) return;

    const event: MatchEvent = {
      id: `ret-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'RETIRE',
      retiringSide,
      reason,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];

    set({
      match: nextState,
      events: nextEvents,
      announcement: generateAriaAnnouncement(nextState),
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: true,
    });
  },

  walkoverMatch: async (concedingSide, reason) => {
    const { match, events } = get();
    if (!match) return;

    const event: MatchEvent = {
      id: `wo-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'WALKOVER',
      concedingSide,
      reason,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];

    set({
      match: nextState,
      events: nextEvents,
      announcement: generateAriaAnnouncement(nextState),
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: true,
    });
  },

  setPendingPointSide: (side) => set({ pendingPointSide: side }),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  toggleLargeText: () =>
    set((state) => ({ largeTextMode: !state.largeTextMode })),

  resumeLastMatch: async () => {
    try {
      const latest = await db.matches.orderBy('updatedAt').reverse().first();
      if (latest && !latest.completed) {
        // Re-derive state from events to ensure event-sourcing fidelity
        const derivedState =
          latest.events.length > 0
            ? replay(latest.events, latest.config)
            : createMatch(latest.config);

        set({
          match: derivedState,
          events: latest.events,
          announcement: generateAriaAnnouncement(derivedState),
        });
        return true;
      }
    } catch (e) {
      console.warn('Failed to resume match from IndexedDB', e);
    }
    return false;
  },

  resetMatch: () =>
    set({
      match: null,
      events: [],
      pendingPointSide: null,
      announcement: '',
    }),
}));
