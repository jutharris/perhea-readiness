
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const startApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Could not find root element 'root' to mount the application.");
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error: any) {
    console.error("App failed to mount:", error);
    // Trigger the panic overlay defined in index.html if possible
    if (typeof (window as any).showPanic === 'function') {
      (window as any).showPanic('Mount Error: ' + error.message, error.stack);
    }
  }
};

// Ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
