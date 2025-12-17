import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PositionLadder, type LadderLevel, type Position } from './PositionLadder';

const testLevels: LadderLevel[] = [
  { price: 100.0, bidQty: 500, askQty: 0 },
  { price: 100.5, bidQty: 300, askQty: 0 },
  { price: 101.0, bidQty: 100, askQty: 200 },
  { price: 101.5, bidQty: 0, askQty: 400 },
  { price: 102.0, bidQty: 0, askQty: 600 },
];

const testPosition: Position = {
  entryPrice: 101.0,
  quantity: 100,
  side: 'long',
};

describe('PositionLadder', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders column headers', () => {
      render(<PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} />);

      expect(screen.getByText('Bid')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Ask')).toBeInTheDocument();
    });

    it('renders price levels', () => {
      render(<PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} visibleLevels={10} />);

      expect(screen.getByText('101.00')).toBeInTheDocument();
      expect(screen.getByText('100.50')).toBeInTheDocument();
      expect(screen.getByText('101.50')).toBeInTheDocument();
    });

    it('renders bid quantities on left', () => {
      render(<PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} visibleLevels={10} />);

      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });

    it('renders ask quantities on right', () => {
      render(<PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} visibleLevels={10} />);

      expect(screen.getByText('400')).toBeInTheDocument();
      expect(screen.getByText('600')).toBeInTheDocument();
    });

    it('respects visibleLevels prop', () => {
      const { container } = render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} visibleLevels={5} />
      );

      const rows = container.querySelectorAll('.askturret-ladder-row');
      expect(rows.length).toBe(5);
    });

    it('respects priceDecimals prop', () => {
      render(<PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} priceDecimals={4} />);

      expect(screen.getByText('101.0000')).toBeInTheDocument();
    });
  });

  describe('position display', () => {
    it('renders position info when provided', () => {
      const { container } = render(
        <PositionLadder
          levels={testLevels}
          tickSize={0.5}
          centerPrice={101.0}
          position={testPosition}
          lastPrice={102.0}
        />
      );

      expect(screen.getByText(/LONG/)).toBeInTheDocument();
      // Check position footer exists
      const positionFooter = container.querySelector('.askturret-ladder-position');
      expect(positionFooter).toBeInTheDocument();
    });

    it('shows position marker on entry price row', () => {
      const { container } = render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} position={testPosition} />
      );

      const positionRow = container.querySelector('.askturret-ladder-row.position');
      expect(positionRow).toBeInTheDocument();
    });

    it('calculates P&L for long position', () => {
      render(
        <PositionLadder
          levels={testLevels}
          tickSize={0.5}
          centerPrice={101.0}
          position={testPosition}
          lastPrice={102.0}
        />
      );

      // P&L = (102 - 101) * 100 = +100
      expect(screen.getByText('+100.00')).toBeInTheDocument();
    });

    it('calculates P&L for short position', () => {
      const shortPosition: Position = {
        entryPrice: 101.0,
        quantity: 100,
        side: 'short',
      };

      render(
        <PositionLadder
          levels={testLevels}
          tickSize={0.5}
          centerPrice={101.0}
          position={shortPosition}
          lastPrice={102.0}
        />
      );

      // P&L = (101 - 102) * 100 = -100
      expect(screen.getByText('-100.00')).toBeInTheDocument();
    });
  });

  describe('last price highlight', () => {
    it('highlights last traded price row', () => {
      const { container } = render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} lastPrice={101.5} />
      );

      const lastPriceRow = container.querySelector('.askturret-ladder-row.last-price');
      expect(lastPriceRow).toBeInTheDocument();
    });
  });

  describe('click handlers', () => {
    it('calls onBidClick when bid cell is clicked', () => {
      const handleBidClick = vi.fn();

      render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} onBidClick={handleBidClick} />
      );

      const bidCell = screen.getByText('500').closest('.askturret-ladder-cell');
      fireEvent.click(bidCell!);

      expect(handleBidClick).toHaveBeenCalledWith(100.0);
    });

    it('calls onAskClick when ask cell is clicked', () => {
      const handleAskClick = vi.fn();

      render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} onAskClick={handleAskClick} />
      );

      const askCell = screen.getByText('600').closest('.askturret-ladder-cell');
      fireEvent.click(askCell!);

      expect(handleAskClick).toHaveBeenCalledWith(102.0);
    });

    it('adds clickable class when click handler is provided', () => {
      const handleBidClick = vi.fn();
      const { container } = render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} onBidClick={handleBidClick} />
      );

      const bidCells = container.querySelectorAll('.askturret-ladder-cell.bid');
      bidCells.forEach((cell) => {
        expect(cell).toHaveClass('clickable');
      });
    });
  });

  describe('recenter button', () => {
    it('shows recenter button when onRecenter is provided', () => {
      const handleRecenter = vi.fn();

      render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} onRecenter={handleRecenter} />
      );

      expect(screen.getByTitle('Recenter')).toBeInTheDocument();
    });

    it('calls onRecenter when button is clicked', () => {
      const handleRecenter = vi.fn();

      render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} onRecenter={handleRecenter} />
      );

      const recenterBtn = screen.getByTitle('Recenter');
      fireEvent.click(recenterBtn);

      expect(handleRecenter).toHaveBeenCalled();
    });
  });

  describe('depth bars', () => {
    it('shows depth bars by default', () => {
      const { container } = render(<PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} />);

      const depthBars = container.querySelectorAll('.askturret-ladder-depth-bar');
      expect(depthBars.length).toBeGreaterThan(0);
    });

    it('hides depth bars when showDepthBars is false', () => {
      const { container } = render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} showDepthBars={false} />
      );

      const depthBars = container.querySelectorAll('.askturret-ladder-depth-bar');
      expect(depthBars.length).toBe(0);
    });
  });

  describe('compact mode', () => {
    it('applies compact class when compact is true', () => {
      const { container } = render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} compact={true} />
      );

      expect(container.querySelector('.askturret-ladder.compact')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PositionLadder levels={testLevels} tickSize={0.5} centerPrice={101.0} className="custom-class" />
      );

      expect(container.querySelector('.askturret-ladder.custom-class')).toBeInTheDocument();
    });
  });
});
