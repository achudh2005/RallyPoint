import React, { useEffect, useState } from 'react';
import { useMatchStore } from './store/matchStore.js';
import { MatchSetup } from './components/MatchSetup.js';
import { ScoringScreen } from './components/ScoringScreen.js';
import { MatchSummary } from './components/MatchSummary.js';
import { TournamentManager } from './components/tournaments/TournamentManager.js';
import { CommunityMatchSetup } from './components/ranking/CommunityMatchSetup.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

export const App: React.FC = () => {
  const { match, theme, largeTextMode, toggleTheme, toggleLargeText, resetMatch } =
    useMatchStore();
  const [activeTab, setActiveTab] = useState<'match' | 'tournament' | 'community'>('match');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen flex flex-col transition-colors ${
          theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Global Top Navbar */}
        <header className="border-b border-gray-800/80 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏸</span>
            <span className="font-black text-sm tracking-tight">RallyPoint</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
              BWF PWA
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'community' ? 'match' : 'community')}
              title="Community Roster & League Setup"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                activeTab === 'community'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              👥 Community
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'tournament' ? 'match' : 'tournament')}
              title="Tournament Manager"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                activeTab === 'tournament'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🏆 Tournaments
            </button>
            <button
              onClick={toggleLargeText}
              title="Toggle Large Text Mode"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                largeTextMode
                  ? 'bg-amber-400 text-gray-950 border-amber-300'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              A+
            </button>
            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              className="p-1.5 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {match && (
              <button
                onClick={() => {
                  resetMatch();
                  setActiveTab('match');
                }}
                title="Reset or Cancel Match"
                className="text-xs bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-2.5 py-1 rounded-lg font-medium transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-3">
          {activeTab === 'community' ? (
            <CommunityMatchSetup onStart={() => setActiveTab('match')} />
          ) : activeTab === 'tournament' ? (
            <TournamentManager onClose={() => setActiveTab('match')} />
          ) : !match ? (
            <MatchSetup />
          ) : match.status === 'COMPLETED' ? (
            <MatchSummary state={match} />
          ) : (
            <ScoringScreen />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};
export default App;
