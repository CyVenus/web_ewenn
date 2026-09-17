import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '../styles/tokens.css';
import '../styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from '../components/HomePage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
);
