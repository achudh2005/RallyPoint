import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@rallypoint/ui';
import { useMatchStore } from './store/matchStore.js';
import { TabBar, MainTab } from './components/navigation/TabBar.js';
import { PlayScreen } from './components/play/PlayScreen.js';
import { AppleScoringScreen } from './components/scoring/AppleScoringScreen.js';
import { AppleRankingsScreen } from './components/rankings/AppleRankingsScreen.js';
import { ApplePlayersScreen } from './components/players/ApplePlayersScreen.js';
import { AppleProfileScreen } from './components/profile/AppleProfileScreen.js';
import { AppleMatchSummarySheet } from './components/summary/AppleMatchSummarySheet.js';
import { OnboardingSheet } from './components/onboarding/OnboardingSheet.js';
import { ConfettiCelebration } from './components/effects/ConfettiCelebration.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { Moon, Sun, Type } from 'lucide-react';
import { nativeStatusBar } from './mobile/statusBar.js';
import { initNativeBackButton } from './mobile/backButton.js';
import { FuntouchBatteryModal } from './components/mobile/FuntouchBatteryModal.js';

export const AppContent: React.FC = () => {
  const {
    match,
    theme,
    largeTextMode,
    announcement,
    toggleTheme,
    toggleLargeText,
    resetMatch,
    resumeLastMatch,
  } = useMatchStore();

  const [activeTab, setActiveTab] = useState<MainTab>('play');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);

  // Resume active match on launch (Crash & Kill Recovery)
  useEffect(() => {
    resumeLastMatch();
  }, [resumeLastMatch]);

  // Hardware Back Button & Double-Back to Exit on Android
  useEffect(() => {
    initNativeBackButton(() => {
      setShowExitToast(true);
      setTimeout(() => setShowExitToast(false), 2000);
    });
  }, []);

  useEffect(() => {
    try {
      const completed = localStorage.getItem('rallypoint_onboarding_completed');
      if (!completed) {
        setShowOnboarding(true);
      }
    } catch {
      // In tests without localstorage
    }
  }, []);

  const handleCompleteOnboarding = () => {
    try {
      localStorage.setItem('rallypoint_onboarding_completed', 'true');
    } catch {}
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      nativeStatusBar.setDark();
    } else {
      document.documentElement.classList.remove('dark');
      nativeStatusBar.setLight();
    }
  }, [theme]);

  // If a match is LIVE, show the full-screen Apple live scoring screen
  if (match && match.status === 'IN_PROGRESS') {
    return (
      <ErrorBoundary>
        <AppleScoringScreen />
        <div aria-live="assertive" className="sr-only">
          {announcement}
        </div>
      </ErrorBoundary>
    );
  }

  // If a match is COMPLETED, show the Apple match summary with celebratory confetti
  if (match && match.status === 'COMPLETED') {
    return (
      <ErrorBoundary>
        <ConfettiCelebration />
        <div className="min-h-screen bg-neutral-100 dark:bg-black text-neutral-900 dark:text-white p-4 pb-20">
          <header className="max-w-md mx-auto mb-2 flex items-center justify-between">
            <span className="font-bold text-lg">🏸 RallyPoint</span>
            <button
              onClick={() => resetMatch()}
              className="text-xs px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 font-semibold"
            >
              Done
            </button>
          </header>
          <AppleMatchSummarySheet state={match} onDone={() => setActiveTab('play')} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen flex flex-col transition-colors selection:bg-emerald-500/20 ${
          theme === 'dark' ? 'bg-[#000000] text-white' : 'bg-[#F2F2F7] text-neutral-900'
        }`}
      >
        {/* Subtle Apple Top Navigation Header */}
        <header className="border-b border-black/5 dark:border-white/10 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏸</span>
            <span className="font-bold text-sm tracking-tight">RallyPoint</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
              BWF PWA
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleLargeText}
              title="Toggle Large Text Mode"
              className={`p-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                largeTextMode
                  ? 'bg-amber-400 text-gray-950 border-amber-300'
                  : 'bg-black/5 dark:bg-white/10 border-transparent text-neutral-700 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/20'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              className="p-1.5 rounded-lg text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-neutral-700 dark:text-neutral-300 border border-transparent transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </header>

        {/* Tab Content - Responsive sizing for mobile and tablet/desktop */}
        <main className="flex-1 w-full max-w-lg lg:max-w-2xl mx-auto overflow-y-auto">
          {activeTab === 'play' && (
            <PlayScreen onStartMatch={() => {}} />
          )}

          {activeTab === 'rankings' && (
            <AppleRankingsScreen />
          )}

          {activeTab === 'players' && (
            <ApplePlayersScreen />
          )}

          {activeTab === 'profile' && (
            <AppleProfileScreen />
          )}
        </main>

        {/* 4-Tab Bottom Bar (Floats as an Apple dock on desktop) */}
        <TabBar activeTab={activeTab} onChange={(t) => setActiveTab(t)} />

        {/* First-Run 3-Step Onboarding */}
        <OnboardingSheet
          isOpen={showOnboarding}
          onComplete={handleCompleteOnboarding}
        />

        {/* Funtouch OS / OriginOS Background Activity Guide */}
        <FuntouchBatteryModal />

        {/* Android Double-Back to Exit Toast Notice */}
        {showExitToast && (
          <div className="fixed bottom-20 inset-x-0 mx-auto w-fit z-50 px-4 py-2 bg-neutral-900/90 text-white text-xs font-medium rounded-full shadow-lg border border-white/10 backdrop-blur-md animate-fade-in">
            Press back again to exit RallyPoint
          </div>
        )}

        {/* ARIA Announcement Region */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider defaultScheme="dark" defaultAccent="green">
      <AppContent />
    </ThemeProvider>
  );
};
export default App;
