import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@askturret/grid/src/styles/grid.css';
import '@askturret/grid/src/styles/orderbook.css';
import '@askturret/grid/src/styles/topmovers.css';
import '@askturret/grid/src/styles/timesales.css';
import '@askturret/grid/src/styles/positionladder.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
