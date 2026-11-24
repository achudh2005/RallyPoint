import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppleProfileScreen } from './AppleProfileScreen.js';

describe('AppleProfileScreen Component (Phase 3)', () => {
  it('renders settings grouped list with appearance and data options', () => {
    render(<AppleProfileScreen />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Dark Appearance')).toBeInTheDocument();
    expect(screen.getByText('Accent Color')).toBeInTheDocument();
    expect(screen.getByText('Rebuild Rankings')).toBeInTheDocument();
    expect(screen.getByText('UI Component Gallery')).toBeInTheDocument();
  });

  it('navigates to component showcase and returns', () => {
    render(<AppleProfileScreen />);

    const galleryRow = screen.getByText('UI Component Gallery');
    fireEvent.click(galleryRow);

    expect(screen.getByText('Component Showcase')).toBeInTheDocument();
    const backBtn = screen.getByText('← Back to Settings');
    fireEvent.click(backBtn);

    expect(screen.getByText('Dark Appearance')).toBeInTheDocument();
  });
});
