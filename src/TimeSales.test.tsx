import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TimeSales, type Trade } from './TimeSales';

const testTrades: Trade[] = [
  { id: '1', timestamp: 1700000001000, side: 'buy', price: 100.5, quantity: 50 },
  { id: '2', timestamp: 1700000000500, side: 'sell', price: 100.25, quantity: 25 },
  { id: '3', timestamp: 1700000000000, side: 'buy', price: 100.0, quantity: 100 },
];

describe('TimeSales', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders column headers by default', () => {
      render(<TimeSales trades={testTrades} />);

      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Side')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Qty')).toBeInTheDocument();
    });

    it('hides headers when showHeader is false', () => {
      render(<TimeSales trades={testTrades} showHeader={false} />);

      expect(screen.queryByText('Time')).not.toBeInTheDocument();
    });

    it('renders all trades', () => {
      render(<TimeSales trades={testTrades} />);

      expect(screen.getByText('100.50')).toBeInTheDocument();
      expect(screen.getByText('100.25')).toBeInTheDocument();
      expect(screen.getByText('100.00')).toBeInTheDocument();
    });

    it('renders buy/sell sides correctly', () => {
      render(<TimeSales trades={testTrades} />);

      const buyLabels = screen.getAllByText('BUY');
      const sellLabels = screen.getAllByText('SELL');

      expect(buyLabels.length).toBe(2);
      expect(sellLabels.length).toBe(1);
    });

    it('renders empty message when no trades', () => {
      render(<TimeSales trades={[]} />);

      expect(screen.getByText('No trades')).toBeInTheDocument();
    });

    it('formats quantity correctly', () => {
      render(<TimeSales trades={testTrades} />);

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('respects priceDecimals prop', () => {
      render(<TimeSales trades={testTrades} priceDecimals={4} />);

      expect(screen.getByText('100.5000')).toBeInTheDocument();
    });

    it('respects quantityDecimals prop', () => {
      const tradesWithDecimals: Trade[] = [
        { id: '1', timestamp: Date.now(), side: 'buy', price: 100, quantity: 50.5 },
      ];

      render(<TimeSales trades={tradesWithDecimals} quantityDecimals={2} />);

      expect(screen.getByText('50.50')).toBeInTheDocument();
    });
  });

  describe('maxTrades', () => {
    it('limits displayed trades', () => {
      const manyTrades: Trade[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        timestamp: Date.now() - i * 100,
        side: 'buy' as const,
        price: 100 + i,
        quantity: 10 + i,
      }));

      render(<TimeSales trades={manyTrades} maxTrades={5} />);

      // Should only show first 5 trades
      expect(screen.getByText('100.00')).toBeInTheDocument();
      expect(screen.getByText('104.00')).toBeInTheDocument();
      expect(screen.queryByText('105.00')).not.toBeInTheDocument();
    });
  });

  describe('tick direction', () => {
    it('hides tick column by default', () => {
      render(<TimeSales trades={testTrades} />);

      expect(screen.queryByText('Tick')).not.toBeInTheDocument();
    });

    it('shows tick column when showTickDirection is true', () => {
      render(<TimeSales trades={testTrades} showTickDirection={true} />);

      expect(screen.getByText('Tick')).toBeInTheDocument();
    });

    it('shows up/down indicators correctly', () => {
      // First trade (100.5) > second trade (100.25) = up
      // Second trade (100.25) > third trade (100.0) = up
      render(<TimeSales trades={testTrades} showTickDirection={true} />);

      const upArrows = screen.getAllByText('▲');
      expect(upArrows.length).toBe(2);
    });
  });

  describe('large trade highlighting', () => {
    it('highlights trades above threshold', () => {
      const { container } = render(<TimeSales trades={testTrades} largeTradeThreshold={75} />);

      const largeTradeRows = container.querySelectorAll('.askturret-timesales-trade.large');
      expect(largeTradeRows.length).toBe(1); // Only the 100 qty trade
    });

    it('does not highlight when no threshold set', () => {
      const { container } = render(<TimeSales trades={testTrades} />);

      const largeTradeRows = container.querySelectorAll('.askturret-timesales-trade.large');
      expect(largeTradeRows.length).toBe(0);
    });
  });

  describe('click handler', () => {
    it('calls onTradeClick when trade is clicked', () => {
      const handleClick = vi.fn();

      render(<TimeSales trades={testTrades} onTradeClick={handleClick} />);

      const firstTrade = screen.getByText('100.50').closest('.askturret-timesales-trade');
      fireEvent.click(firstTrade!);

      expect(handleClick).toHaveBeenCalledWith(testTrades[0]);
    });

    it('adds clickable class when onTradeClick is provided', () => {
      const handleClick = vi.fn();
      const { container } = render(<TimeSales trades={testTrades} onTradeClick={handleClick} />);

      const rows = container.querySelectorAll('.askturret-timesales-trade');
      rows.forEach((row) => {
        expect(row).toHaveClass('clickable');
      });
    });
  });

  describe('compact mode', () => {
    it('applies compact class when compact is true', () => {
      const { container } = render(<TimeSales trades={testTrades} compact={true} />);

      expect(container.querySelector('.askturret-timesales.compact')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(<TimeSales trades={testTrades} className="custom-class" />);

      expect(container.querySelector('.askturret-timesales.custom-class')).toBeInTheDocument();
    });
  });

  describe('numeric ID support', () => {
    it('handles numeric trade IDs', () => {
      const numericIdTrades: Trade[] = [
        { id: 1, timestamp: Date.now(), side: 'buy', price: 100, quantity: 50 },
        { id: 2, timestamp: Date.now() - 100, side: 'sell', price: 99, quantity: 25 },
      ];

      render(<TimeSales trades={numericIdTrades} />);

      expect(screen.getByText('100.00')).toBeInTheDocument();
      expect(screen.getByText('99.00')).toBeInTheDocument();
    });
  });
});
