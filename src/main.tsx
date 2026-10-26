import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/board.css';
import './styles/play.css';
import './styles/panels.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
