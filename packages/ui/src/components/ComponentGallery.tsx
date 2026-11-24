import React, { useState } from 'react';
import { useTheme } from '../theme.js';
import { LargeTitle } from './LargeTitle.js';
import { GroupedList, GroupedSection, GroupedRow } from './GroupedList.js';
import { SegmentedControl } from './SegmentedControl.js';
import { BottomSheet } from './BottomSheet.js';
import { useToast } from './Toast.js';
import { Toggle } from './Toggle.js';
import { Stepper } from './Stepper.js';
import { Avatar } from './Avatar.js';
import { Badge } from './Badge.js';
import { EmptyState } from './EmptyState.js';
import { Skeleton } from './Skeleton.js';
import { Button } from './Button.js';
import { ScoreNumberRoll } from './ScoreNumberRoll.js';
import { AccentColor } from '../tokens.js';
import { Bell, Shield, Sparkles, Moon, Sun, Smartphone } from 'lucide-react';

export const ComponentGallery: React.FC = () => {
  const { colorScheme, setColorScheme, accent, setAccent, textSize, setTextSize } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'components' | 'typography' | 'colors'>('components');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toggleState, setToggleState] = useState(true);
  const [stepperVal, setStepperVal] = useState(21);
  const [scoreVal, setScoreVal] = useState(14);

  const accents: AccentColor[] = ['green', 'blue', 'teal', 'indigo', 'amber'];

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 pt-4">
      <LargeTitle
        title="UI Design System"
        subtitle="Apple HIG • RallyPoint"
        trailingAction={
          <Button
            size="sm"
            variant="glass"
            onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
            leadingIcon={colorScheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          >
            {colorScheme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        }
      />

      {/* Main Mode Segments */}
      <div className="mb-6">
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { id: 'components', label: 'Components' },
            { id: 'typography', label: 'Typography' },
            { id: 'colors', label: 'Color Tokens' },
          ]}
        />
      </div>

      {activeTab === 'components' && (
        <GroupedList>
          {/* Action Buttons */}
          <GroupedSection header="Buttons & Tap Targets (Apple HIG 44px+)">
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2.5 items-center">
                <Button variant="primary" size="md">
                  Primary Action
                </Button>
                <Button variant="secondary" size="md">
                  Secondary
                </Button>
                <Button variant="glass" size="md">
                  Glass Material
                </Button>
                <Button variant="destructive" size="md">
                  Destructive
                </Button>
                <Button variant="tertiary" size="md">
                  Tertiary Link
                </Button>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => showToast({ message: 'Match deleted', onUndo: () => console.log('Undo!') })}
              >
                Trigger Toast with 5s Undo
              </Button>
            </div>
          </GroupedSection>

          {/* Interactive Controls */}
          <GroupedSection header="Interactive Controls & Inputs">
            <GroupedRow
              leading={<Bell className="w-5 h-5" />}
              title="Push Notifications"
              subtitle="Score updates during live tournament"
              trailing={<Toggle checked={toggleState} onChange={setToggleState} />}
            />
            <GroupedRow
              leading={<Shield className="w-5 h-5" />}
              title="Target Game Score"
              subtitle="Configured winning points"
              trailing={<Stepper value={stepperVal} onChange={setStepperVal} min={11} max={30} />}
            />
            <GroupedRow
              leading={<Sparkles className="w-5 h-5" />}
              title="Native Bottom Sheet"
              subtitle="Drag down to dismiss modal with grabber"
              showChevron
              onClick={() => setIsSheetOpen(true)}
            />
          </GroupedSection>

          {/* Score Roll Demo */}
          <GroupedSection header="Animated Score Roll (Framer Motion)">
            <div className="p-6 flex flex-col items-center justify-center bg-neutral-100/50 dark:bg-black/20 rounded-xl">
              <ScoreNumberRoll score={scoreVal} size="giant" />
              <div className="flex gap-3 mt-4">
                <Button size="sm" variant="secondary" onClick={() => setScoreVal((s) => Math.max(0, s - 1))}>
                  -1 Point
                </Button>
                <Button size="sm" variant="primary" onClick={() => setScoreVal((s) => s + 1)}>
                  +1 Point
                </Button>
              </div>
            </div>
          </GroupedSection>

          {/* Avatars & Badges */}
          <GroupedSection header="Avatars & Semantic Badges">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name="Viktor Axelsen" size="xl" status="serving" />
                <Avatar name="Kento Momota" size="lg" status="winner" />
                <Avatar name="Lee Zii Jia" size="md" />
                <Avatar name="Akane Yamaguchi" size="sm" />
                <Avatar name="Tai Tzu Ying" size="xs" />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="accent">Accent</Badge>
                <Badge variant="success">Game Point</Badge>
                <Badge variant="warning">Service Fault</Badge>
                <Badge variant="destructive">Retired</Badge>
                <Badge variant="neutral">Neutral 15 pt</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>
          </GroupedSection>

          {/* Empty State */}
          <GroupedSection header="Empty State Pattern">
            <EmptyState
              icon={<Smartphone className="w-8 h-8" />}
              title="No Recent Matches"
              description="Start a match in 10 seconds or review community rankings."
              actionLabel="Start a Match"
              onAction={() => setIsSheetOpen(true)}
            />
          </GroupedSection>

          {/* Skeleton Loaders */}
          <GroupedSection header="Skeleton Loading Placeholders">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              </div>
              <Skeleton variant="rounded" height={60} />
            </div>
          </GroupedSection>
        </GroupedList>
      )}

      {activeTab === 'typography' && (
        <GroupedList>
          <GroupedSection header="SF Pro / Inter Typographic Hierarchy">
            <div className="p-4 space-y-4">
              <div>
                <p className="text-[11px] text-neutral-400 uppercase font-mono">Large Title (34px Bold)</p>
                <h1 className="text-[34px] leading-[41px] font-bold text-neutral-900 dark:text-white">
                  RallyPoint Score
                </h1>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase font-mono">Title (28px Bold)</p>
                <h2 className="text-[28px] leading-[34px] font-bold text-neutral-900 dark:text-white">
                  Court 1 Standings
                </h2>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase font-mono">Headline (17px Semibold)</p>
                <p className="text-[17px] leading-[22px] font-semibold text-neutral-900 dark:text-white">
                  Axelsen vs. Momota (Final)
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase font-mono">Body (17px Regular)</p>
                <p className="text-[17px] leading-[22px] text-neutral-700 dark:text-neutral-300">
                  Every rally scores a point. First player to 21 with a 2-point lead wins.
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase font-mono">Subhead (15px)</p>
                <p className="text-[15px] leading-[20px] text-neutral-500 dark:text-neutral-400">
                  Deciding game switch sides at 11 points.
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase font-mono">Caption (12px)</p>
                <p className="text-[12px] leading-[16px] text-neutral-400 dark:text-neutral-500">
                  Updated 2 minutes ago • BWF Event Sourced
                </p>
              </div>
            </div>
          </GroupedSection>
        </GroupedList>
      )}

      {activeTab === 'colors' && (
        <GroupedList>
          <GroupedSection header="Dynamic Apple Accent Color Selection">
            <div className="p-4">
              <p className="text-[14px] text-neutral-500 dark:text-neutral-400 mb-4">
                Choose the primary accent tint used across buttons, switches, and active tabs:
              </p>
              <div className="grid grid-cols-5 gap-3 text-center">
                {accents.map((acc) => (
                  <button
                    key={acc}
                    onClick={() => setAccent(acc)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${
                        accent === acc ? 'ring-4 ring-offset-2 ring-neutral-400' : ''
                      }`}
                      style={{
                        backgroundColor:
                          acc === 'green'
                            ? '#34C759'
                            : acc === 'blue'
                            ? '#007AFF'
                            : acc === 'teal'
                            ? '#30B0C7'
                            : acc === 'indigo'
                            ? '#5856D6'
                            : '#FF9500',
                      }}
                    >
                      {accent === acc && '✓'}
                    </div>
                    <span className="text-[11px] font-medium capitalize text-neutral-700 dark:text-neutral-300">
                      {acc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </GroupedSection>

          <GroupedSection header="Text Size Dynamic Type Scaling">
            <div className="p-4 space-y-3">
              <SegmentedControl
                value={textSize}
                onChange={setTextSize}
                options={[
                  { id: 'standard', label: 'Standard' },
                  { id: 'large', label: 'Large (+15%)' },
                  { id: 'accessibility', label: 'A11y (+30%)' },
                ]}
              />
            </div>
          </GroupedSection>
        </GroupedList>
      )}

      {/* Demo Bottom Sheet */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Start a Match"
        rightAction={
          <button
            onClick={() => setIsSheetOpen(false)}
            className="text-emerald-500 font-semibold text-[16px]"
          >
            Done
          </button>
        }
      >
        <div className="py-4 space-y-4">
          <p className="text-[15px] text-neutral-600 dark:text-neutral-300">
            This bottom sheet mimics the native iOS detent modal with a top grabber handle, gesture drag-to-dismiss, and dimmed backdrop.
          </p>
          <Button variant="primary" fullWidth size="lg" onClick={() => setIsSheetOpen(false)}>
            Continue
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
