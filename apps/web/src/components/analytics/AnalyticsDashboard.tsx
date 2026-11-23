import React, { useState } from 'react';
import type { MatchEvent, MatchState } from '@rallypoint/engine';
import { getStats } from '@rallypoint/engine';
import { MomentumChart } from './MomentumChart.js';
import { ScoreProgressionChart } from './ScoreProgressionChart.js';
import { WinProbabilityChart } from './WinProbabilityChart.js';
import { PressurePointsTracker } from './PressurePointsTracker.js';
import { ShotHeatmap } from './ShotHeatmap.js';
import { PlayerProfiles } from './PlayerProfiles.js';
import { ShareableScorecard } from './ShareableScorecard.js';
import { exportMatchCSV, exportMatchJSON } from '../../analytics/exportUtils.js';

interface AnalyticsDashboardProps {
  state: MatchState;
  events: MatchEvent[];
  onBack: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  state,
  events,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'shots' | 'h2h' | 'card'>('charts');

  const stats = getStats(events, state.config);
  const nameA = state.config.sideA.name;
  const nameB = state.config.sideB.name;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 p-3 animate-fadeIn">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-3 rounded-2xl shadow-lg">
        <button
          onClick={onBack}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
        >
          <span>←</span> Back
        </button>

        <div className="text-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Match Analytics</h3>
          <div className="text-[10px] text-gray-400 font-mono">
            {nameA} vs {nameB}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => exportMatchCSV(state, events)}
            title="Download CSV"
            className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-1 rounded-lg font-mono font-bold hover:bg-emerald-900 transition-colors"
          >
            CSV
          </button>
          <button
            onClick={() => exportMatchJSON(state, events)}
            title="Download JSON"
            className="text-[11px] bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-2 py-1 rounded-lg font-mono font-bold hover:bg-cyan-900 transition-colors"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 bg-gray-900 p-1 rounded-2xl border border-gray-800 text-xs font-semibold text-center">
        <button
          onClick={() => setActiveTab('charts')}
          className={`py-2 rounded-xl transition-colors ${
            activeTab === 'charts' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          Charts
        </button>
        <button
          onClick={() => setActiveTab('shots')}
          className={`py-2 rounded-xl transition-colors ${
            activeTab === 'shots' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          Shots
        </button>
        <button
          onClick={() => setActiveTab('h2h')}
          className={`py-2 rounded-xl transition-colors ${
            activeTab === 'h2h' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          H2H
        </button>
        <button
          onClick={() => setActiveTab('card')}
          className={`py-2 rounded-xl transition-colors ${
            activeTab === 'card' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          Story Card
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          <MomentumChart stats={stats} nameA={nameA} nameB={nameB} />
          <WinProbabilityChart stats={stats} nameA={nameA} nameB={nameB} />
          <ScoreProgressionChart stats={stats} nameA={nameA} nameB={nameB} />
          <PressurePointsTracker stats={stats} nameA={nameA} nameB={nameB} />
        </div>
      )}

      {activeTab === 'shots' && (
        <div className="space-y-4">
          <ShotHeatmap stats={stats} nameA={nameA} nameB={nameB} />
          <PressurePointsTracker stats={stats} nameA={nameA} nameB={nameB} />
        </div>
      )}

      {activeTab === 'h2h' && (
        <div className="space-y-4">
          <PlayerProfiles nameA={nameA} nameB={nameB} />
        </div>
      )}

      {activeTab === 'card' && (
        <div className="flex justify-center py-2">
          <ShareableScorecard state={state} events={events} />
        </div>
      )}
    </div>
  );
};
