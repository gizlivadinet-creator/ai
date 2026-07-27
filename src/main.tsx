import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { preloadModel } from './lib/search/embeddings';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Warm up the free local semantic-search model in the background so the
// first search a user runs doesn't have to wait for the ~25MB download.
preloadModel();
