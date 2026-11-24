import React, { useState } from 'react';
import { BottomSheet, Button, Haptics } from '@rallypoint/ui';
import { Zap, ShieldCheck, Trophy, ChevronRight } from 'lucide-react';

export interface OnboardingSheetProps {
  isOpen: boolean;
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: <Zap className="w-12 h-12 text-emerald-500" />,
    badge: 'Step 1 of 3',
    title: 'Score in 10 Seconds',
    description:
      'Tap either half of the calm screen to score a point. Undo any mistake with a single tap. Designed to never get in the way of your play.',
  },
  {
    icon: <ShieldCheck className="w-12 h-12 text-blue-500" />,
    badge: 'Step 2 of 3',
    title: 'Rally or Service Point',
    description:
      'Choose modern Rally Point 21 or classic Service Point 15 with automatic side-outs, setting rules (14-all), and server rotations.',
  },
  {
    icon: <Trophy className="w-12 h-12 text-amber-500" />,
    badge: 'Step 3 of 3',
    title: 'Live Community Rankings',
    description:
      'Event-sourced ratings that update point by point. View top players, doubles pairs, win streaks, and balanced team suggestions.',
  },
];

export const OnboardingSheet: React.FC<OnboardingSheetProps> = ({
  isOpen,
  onComplete,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    Haptics.selection();
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      Haptics.pointScored();
      onComplete();
    }
  };

  const handleSkip = () => {
    Haptics.selection();
    onComplete();
  };

  const slide = SLIDES[currentSlide] ?? SLIDES[0]!;

  return (
    <BottomSheet isOpen={isOpen} onClose={onComplete} title="Welcome to RallyPoint">
      <div className="pb-6 pt-2 text-neutral-900 dark:text-white space-y-6 max-w-sm mx-auto text-center select-none">
        {/* Animated Icon Circle */}
        <div className="w-24 h-24 rounded-3xl bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto shadow-inner">
          {slide.icon}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {slide.badge}
          </span>
          <h2 className="text-2xl font-black tracking-tight">{slide.title}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed px-2">
            {slide.description}
          </p>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'w-6 bg-emerald-500'
                  : 'w-2 bg-black/10 dark:bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleSkip}
          >
            Skip
          </Button>

          <Button
            variant="primary"
            fullWidth
            onClick={handleNext}
            className="flex items-center justify-center gap-1.5"
          >
            <span>{currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
