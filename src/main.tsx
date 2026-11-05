import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { addSystemLog } from './utils/logger';

// Escuchas globales (FIX-ROBUST-001): hay errores que no pasan por el render —
// un handler de evento, un efecto, una promesa sin catch — y sin esto se pierden.
// Se limita el registro para que un bucle no llene el log.
const registrados = new Map<string, number>();
const VENTANA_MS = 60_000;

function registrarUnaVez(mensaje: string) {
  const ahora = Date.now();
  const previo = registrados.get(mensaje);
  if (previo !== undefined && ahora - previo < VENTANA_MS) return;
  registrados.set(mensaje, ahora);
  addSystemLog('ERROR', 'Sistema', mensaje);
}

window.addEventListener('error', (evento) => {
  const msg = evento?.error?.message || evento?.message || 'Error desconocido';
  registrarUnaVez(`Excepción no controlada en la interfaz: ${msg}`);
  console.error('[ui] window.onerror:', evento?.error || msg);
});

window.addEventListener('unhandledrejection', (evento) => {
  const razon: unknown = evento?.reason;
  const msg = razon instanceof Error ? razon.message : String(razon ?? 'Motivo desconocido');
  registrarUnaVez(`Promesa rechazada sin manejar: ${msg}`);
  console.error('[ui] unhandledrejection:', razon);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
