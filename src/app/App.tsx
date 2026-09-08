import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LadderPage } from '../features/ladder/LadderPage';
import { MarblePage } from '../features/marble/MarblePage';
import { StopwatchPage } from '../features/stopwatch/StopwatchPage';
import { HomePage } from './HomePage';
import { ServiceWorkerManager } from './ReloadPrompt';

export function App(): JSX.Element {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ServiceWorkerManager>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stopwatch" element={<StopwatchPage />} />
          <Route path="/ladder" element={<LadderPage />} />
          <Route path="/marble" element={<MarblePage />} />
        </Routes>
      </ServiceWorkerManager>
    </BrowserRouter>
  );
}
