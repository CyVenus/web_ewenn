import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '../styles/tokens.css';
import '../styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DocPage } from '../components/DocPage';
import { TERMS_DOC } from '../content/terms';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DocPage doc={TERMS_DOC} />
  </StrictMode>,
);
