import React, { useState } from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ThemeProvider,
  useTheme,
  SegmentedControl,
  Stepper,
  Toggle,
  Avatar,
  Badge,
  Button,
  LargeTitle,
  GroupedRow,
  EmptyState,
} from './index.js';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const ThemeConsumer = () => {
  const { colorScheme, isDark, accent, setAccent } = useTheme();
  return (
    <div>
      <span data-testid="scheme">{colorScheme}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <span data-testid="accent">{accent}</span>
      <button onClick={() => setAccent('blue')}>Set Blue</button>
    </div>
  );
};

describe('@rallypoint/ui Design System Component Tests', () => {
  it('provides ThemeContext and updates accent color', () => {
    render(
      <ThemeProvider defaultScheme="dark" defaultAccent="green">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('scheme').textContent).toBe('dark');
    expect(screen.getByTestId('isDark').textContent).toBe('true');
    expect(screen.getByTestId('accent').textContent).toBe('green');

    fireEvent.click(screen.getByText('Set Blue'));
    expect(screen.getByTestId('accent').textContent).toBe('blue');
  });

  it('renders LargeTitle with subtitle and trailing action', () => {
    render(
      <LargeTitle
        title="Play Tab"
        subtitle="Match Setup"
        trailingAction={<button>Action</button>}
      />
    );
    expect(screen.getByText('Play Tab')).toBeDefined();
    expect(screen.getByText('Match Setup')).toBeDefined();
    expect(screen.getByText('Action')).toBeDefined();
  });

  it('renders SegmentedControl and switches tabs', () => {
    const TestSeg = () => {
      const [val, setVal] = useState('one');
      return (
        <SegmentedControl
          value={val}
          onChange={setVal}
          options={[
            { id: 'one', label: 'First Tab', badge: 3 },
            { id: 'two', label: 'Second Tab' },
          ]}
        />
      );
    };

    render(
      <ThemeProvider>
        <TestSeg />
      </ThemeProvider>
    );

    expect(screen.getByText('First Tab')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    fireEvent.click(screen.getByText('Second Tab'));
    expect(screen.getByText('Second Tab')).toBeDefined();
  });

  it('renders Stepper and honors min/max bounds', () => {
    const TestStepper = () => {
      const [val, setVal] = useState(21);
      return <Stepper value={val} onChange={setVal} min={20} max={22} />;
    };

    render(<TestStepper />);
    expect(screen.getByText('21')).toBeDefined();

    const decBtn = screen.getByLabelText('Decrease value');
    const incBtn = screen.getByLabelText('Increase value');

    fireEvent.click(decBtn);
    expect(screen.getByText('20')).toBeDefined();
    // Cannot go below min
    fireEvent.click(decBtn);
    expect(screen.getByText('20')).toBeDefined();

    fireEvent.click(incBtn);
    expect(screen.getByText('21')).toBeDefined();
    fireEvent.click(incBtn);
    expect(screen.getByText('22')).toBeDefined();
    // Cannot exceed max
    fireEvent.click(incBtn);
    expect(screen.getByText('22')).toBeDefined();
  });

  it('renders Toggle and triggers onChange', () => {
    const TestToggle = () => {
      const [checked, setChecked] = useState(false);
      return (
        <ThemeProvider>
          <Toggle checked={checked} onChange={setChecked} ariaLabel="Test Switch" />
        </ThemeProvider>
      );
    };

    render(<TestToggle />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('renders Avatar with deterministic initials and status indicators', () => {
    render(<Avatar name="Viktor Axelsen" status="serving" />);
    expect(screen.getByText('VA')).toBeDefined();
    expect(screen.getByTitle('Currently Serving')).toBeDefined();
  });

  it('renders Badge with variants', () => {
    render(
      <ThemeProvider>
        <Badge variant="success">Game Point</Badge>
      </ThemeProvider>
    );
    expect(screen.getByText('Game Point')).toBeDefined();
  });

  it('renders Button with variants and responds to clicks', () => {
    const onClick = vi.fn();
    render(
      <ThemeProvider>
        <Button variant="primary" onClick={onClick}>
          Start Match
        </Button>
      </ThemeProvider>
    );

    const btn = screen.getByText('Start Match');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders GroupedRow with chevron and responds to click', () => {
    const onClick = vi.fn();
    render(
      <GroupedRow
        title="Scoring Rules"
        subtitle="BWF Rally Point"
        showChevron
        onClick={onClick}
      />
    );
    expect(screen.getByText('Scoring Rules')).toBeDefined();
    expect(screen.getByText('BWF Rally Point')).toBeDefined();
    fireEvent.click(screen.getByText('Scoring Rules'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders EmptyState with action button', () => {
    const onAction = vi.fn();
    render(
      <ThemeProvider>
        <EmptyState
          title="No Match Recorded"
          description="Ready to play? Start your first match now."
          actionLabel="New Match"
          onAction={onAction}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('No Match Recorded')).toBeDefined();
    expect(screen.getByText('Ready to play? Start your first match now.')).toBeDefined();
    fireEvent.click(screen.getByText('New Match'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
