import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silences benign Vite dev server HMR websocket connection failures
if (typeof window !== 'undefined') {
  // Early Event Capturers to intercept and completely silence uncaught websocket errors or rejections
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      const reasonStr = String(reason || '');
      const messageStr = String((reason && (reason.rawMessage || reason.message)) || '');
      if (
        reasonStr.toLowerCase().includes('websocket') ||
        messageStr.toLowerCase().includes('websocket') ||
        reasonStr.toLowerCase().includes('closed without opened') ||
        messageStr.toLowerCase().includes('closed without opened')
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    } catch (e) {
      // Ignored
    }
  }, { capture: true });

  window.addEventListener('error', (event) => {
    try {
      const msg = String(event.message || '');
      const err = String(event.error || '');
      if (
        msg.toLowerCase().includes('websocket') ||
        err.toLowerCase().includes('websocket') ||
        msg.toLowerCase().includes('closed without opened') ||
        err.toLowerCase().includes('closed without opened')
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    } catch (e) {
      // Ignored
    }
  }, { capture: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

