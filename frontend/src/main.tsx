import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyTheme, getInitialTheme } from './shared/theme';
import './index.css';

// Apply the persisted/system theme before the first paint to avoid a flash.
applyTheme(getInitialTheme());

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
