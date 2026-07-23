// Polyfill: `bip39` (Node.js lib) usa Buffer internamente, que no existe
// en el navegador. Importamos el paquete `buffer` y lo exponemos como global.
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { OnboardingWizard } from './auth/OnboardingWizard';
import { LockScreen } from './auth/LockScreen';
import { patchConsole } from './security/logSanitizer';
import './index.css';

// En producción, activa el sanitizer de logs para no leak-ear títulos,
// contenido o rutas de archivos.
patchConsole();

const RootRouter: React.FC = () => {
  const { state } = useAuth();
  if (state.kind === 'initializing') {
    return (
      <div className="min-h-screen bg-[#0f0d15] flex items-center justify-center text-white text-xs uppercase tracking-[0.3em] font-bold">
        Loading 2Brain…
      </div>
    );
  }
  if (state.kind === 'setting-up') return <OnboardingWizard />;
  if (state.kind === 'locked') return <LockScreen />;
  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  </StrictMode>,
);
