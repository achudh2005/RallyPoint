import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OnboardingSheet } from './OnboardingSheet.js';

describe('OnboardingSheet Component (Phase 4)', () => {
  it('renders initial welcome card with step 1 and advances to next', () => {
    const handleComplete = vi.fn();
    render(<OnboardingSheet isOpen={true} onComplete={handleComplete} />);

    expect(screen.getAllByText('Welcome to RallyPoint').length).toBeGreaterThan(0);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Add Your Players')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('completes onboarding when skip is tapped', () => {
    const handleComplete = vi.fn();
    render(<OnboardingSheet isOpen={true} onComplete={handleComplete} />);

    const skipBtn = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipBtn);

    expect(handleComplete).toHaveBeenCalledTimes(1);
  });
});
