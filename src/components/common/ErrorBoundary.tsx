import React, { type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { addSystemLog } from '../../utils/logger';

// El proyecto no tiene `@types/react` instalado, así que `React.Component` llega
// como `any` y una clase no heredaría `setState`/`props`. Se toma la base desde
// el runtime con un tipo explícito para que el boundary sea un componente real.
const ComponentBase: any = (React as any).Component;

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string;
}

/**
 * Red de contención de la interfaz (FIX-ROBUST-001 / BR-001, BR-002).
 *
 * React desmonta TODO el árbol ante un error de render, así que sin este
 * boundary una excepción en cualquier componente deja la pantalla en blanco y al
 * operador sin sistema. Acá se muestra una pantalla de recuperación y se deja el
 * error en el log de auditoría para poder diagnosticarlo después.
 *
 * No se toca ningún dato: recargar recupera el estado guardado (el borrador de
 * venta sigue existiendo).
 */
export class ErrorBoundary extends ComponentBase {
  state: ErrorBoundaryState = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = info?.componentStack || '';
    this.setState({ componentStack: stack });

    addSystemLog('ERROR', 'Sistema', `Excepción no controlada en la interfaz: ${error.message}`);
    console.error('[ui] Excepción no controlada:', error, stack);
  }

  private handleRecargar = () => {
    window.location.reload();
  };

  render() {
    const { children } = this.props as ErrorBoundaryProps;
    const { error, componentStack } = this.state;
    if (!error) return children;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">La pantalla tuvo un problema</h1>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            La aplicación se detuvo para no seguir trabajando con datos inconsistentes.{' '}
            <strong>Tus datos están guardados</strong>: al recargar volvés al estado anterior (el borrador de venta se
            conserva).
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Detalle</div>
            <div className="font-mono text-[11px] text-rose-700 dark:text-rose-300 break-words">
              {error.name}: {error.message}
            </div>
          </div>

          {componentStack ? (
            <details className="text-[11px] text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer select-none">Ver traza del componente</summary>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] leading-snug">
                {componentStack.trim()}
              </pre>
            </details>
          ) : null}

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            El error quedó registrado en el log de auditoría (Configuración → Logs).
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRecargar}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium text-xs px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recargar la aplicación</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
