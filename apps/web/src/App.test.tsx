import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { App } from './App.js';
import { useMatchStore } from './store/matchStore.js';
import { db } from './db/index.js';

describe('App Component', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();
  });

  it('renders navbar and setup view by default', () => {
    render(<App />);
    expect(screen.getByText('RallyPoint')).toBeInTheDocument();
    expect(screen.getByText('BWF PWA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start match/i })).toBeInTheDocument();
  });

  it('toggles theme and large text via navbar buttons', () => {
    render(<App />);
    const themeBtn = screen.getByTitle('Toggle Theme');
    fireEvent.click(themeBtn);
    expect(useMatchStore.getState().theme).toBe('light');

    const largeTextBtn = screen.getByTitle('Toggle Large Text Mode');
    fireEvent.click(largeTextBtn);
    expect(useMatchStore.getState().largeTextMode).toBe(true);
  });
});
