import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StopwatchPage } from '../features/stopwatch/StopwatchPage';
import { HomePage } from './HomePage';
import { PlaceholderGamePage } from './PlaceholderGamePage';
import { ServiceWorkerManager } from './ReloadPrompt';

export function App(): JSX.Element {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ServiceWorkerManager>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stopwatch" element={<StopwatchPage />} />
          <Route path="/ladder" element={<PlaceholderGamePage title="사다리 타기" />} />
          <Route path="/marble" element={<PlaceholderGamePage title="마블 룰렛" />} />
        </Routes>
      </ServiceWorkerManager>
    </BrowserRouter>
  );
}
