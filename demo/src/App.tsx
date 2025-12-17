import { useState } from 'react';
import { BasicDemo } from './demos/BasicDemo';
import { PerformanceDemo } from './demos/PerformanceDemo';
import { TradingDemo } from './demos/TradingDemo';
import { OrderBookDemo } from './demos/OrderBookDemo';
import { TopMoversDemo } from './demos/TopMoversDemo';
import { TimeSalesDemo } from './demos/TimeSalesDemo';
import { PositionLadderDemo } from './demos/PositionLadderDemo';
import { ThemingDemo } from './demos/ThemingDemo';
import { BenchmarkDemo } from './demos/BenchmarkDemo';

type DemoTab =
  | 'basic'
  | 'performance'
  | 'trading'
  | 'orderbook'
  | 'timesales'
  | 'ladder'
  | 'topmovers'
  | 'theming'
  | 'benchmark';

export default function App() {
  const [activeTab, setActiveTab] = useState<DemoTab>('basic');

  return (
    <div className="container">
      <h1>@askturret/grid</h1>
      <p className="subtitle">
        High-performance React data grid. Server-side performance, zero server required.
      </p>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Usage
        </button>
        <button
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance Test
        </button>
        <button
          className={`tab ${activeTab === 'trading' ? 'active' : ''}`}
          onClick={() => setActiveTab('trading')}
        >
          Positions
        </button>
        <button
          className={`tab ${activeTab === 'orderbook' ? 'active' : ''}`}
          onClick={() => setActiveTab('orderbook')}
        >
          Order Book
        </button>
        <button
          className={`tab ${activeTab === 'timesales' ? 'active' : ''}`}
          onClick={() => setActiveTab('timesales')}
        >
          Time & Sales
        </button>
        <button
          className={`tab ${activeTab === 'ladder' ? 'active' : ''}`}
          onClick={() => setActiveTab('ladder')}
        >
          Ladder
        </button>
        <button
          className={`tab ${activeTab === 'topmovers' ? 'active' : ''}`}
          onClick={() => setActiveTab('topmovers')}
        >
          Top Movers
        </button>
        <button
          className={`tab ${activeTab === 'theming' ? 'active' : ''}`}
          onClick={() => setActiveTab('theming')}
        >
          Theming
        </button>
        <button
          className={`tab ${activeTab === 'benchmark' ? 'active' : ''}`}
          onClick={() => setActiveTab('benchmark')}
        >
          Benchmarks
        </button>
      </div>

      {activeTab === 'basic' && <BasicDemo />}
      {activeTab === 'performance' && <PerformanceDemo />}
      {activeTab === 'trading' && <TradingDemo />}
      {activeTab === 'orderbook' && <OrderBookDemo />}
      {activeTab === 'timesales' && <TimeSalesDemo />}
      {activeTab === 'ladder' && <PositionLadderDemo />}
      {activeTab === 'topmovers' && <TopMoversDemo />}
      {activeTab === 'theming' && <ThemingDemo />}
      {activeTab === 'benchmark' && <BenchmarkDemo />}
    </div>
  );
}
