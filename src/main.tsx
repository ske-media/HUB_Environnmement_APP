import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { queryClient } from './lib/queryClient';
import { setupQueryPersistence } from './lib/queryPersistence';
import { setupPwa } from './pwa';
import './lib/zodFrenchMessages'; // Charger les messages d'erreur en français pour Zod

setupQueryPersistence(queryClient);
setupPwa();

/**
 * En production, un déploiement peut invalider des chunks dynamiques
 * encore référencés par un onglet déjà ouvert.
 * Vite émet "vite:preloadError" dans ce cas: on force un rechargement
 * unique pour récupérer le dernier index/chunks.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const guardKey = 'vite-preload-recovered';
    if (sessionStorage.getItem(guardKey) === '1') return;
    sessionStorage.setItem(guardKey, '1');
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
