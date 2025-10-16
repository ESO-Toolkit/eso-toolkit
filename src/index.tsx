import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  // StrictMode disabled due to incompatibility with WebGL contexts
  //
  // Strict Mode intentionally unmounts and remounts components during development
  // to help find bugs. However, this causes the WebGL context in the 3D replay
  // viewer to be destroyed and rapidly recreated, which leads to context loss.
  //
  // The WebGL context loss handlers and preserveDrawingBuffer setting in Arena3D.tsx
  // help with real context loss scenarios (GPU issues, tab backgrounding, etc.) but
  // cannot prevent the context destruction caused by Strict Mode's remounting behavior.
  //
  // Note: Production builds don't use Strict Mode, so this only affects development.
  <App />,
);
