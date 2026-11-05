/**
 * Registro de errores del servidor (FIX-ROBUST-001).
 *
 * Escribe en `logs/server-error.log` con fecha, origen y stack, y **nunca lanza**:
 * un fallo al registrar no puede tumbar el proceso que está intentando sobrevivir.
 *
 * Lleva un limitador por mensaje para que un error repetido en bucle (por ejemplo,
 * un cliente que reintenta) no llene el disco.
 */
import fs from 'node:fs';
import path from 'node:path';

export const NOMBRE_ARCHIVO = 'server-error.log';
const MAX_STACK = 4000;
const THROTTLE_MS_POR_DEFECTO = 60_000;

/** Cuerpo del error como texto legible y acotado. */
export function describirError(error) {
  if (error instanceof Error) {
    return error.stack ? error.stack.slice(0, MAX_STACK) : `${error.name}: ${error.message}`;
  }
  if (typeof error === 'string') return error.slice(0, MAX_STACK);
  try {
    return JSON.stringify(error).slice(0, MAX_STACK);
  } catch {
    return String(error).slice(0, MAX_STACK);
  }
}

/** Clave de agrupación para el limitador: origen + primera línea del mensaje. */
export function claveError(origen, error) {
  const primera = (error instanceof Error ? error.message : String(error ?? '')).split('\n')[0];
  return `${origen}:${primera.slice(0, 120)}`;
}

/** Línea completa del log, con salto final. */
export function formatearLinea(origen, error, fecha = new Date()) {
  return `[${fecha.toISOString()}] ${origen}\n${describirError(error)}\n\n`;
}

/**
 * Crea el registrador. Devuelve una función `(origen, error) => boolean`
 * que indica si se escribió (false = omitido por el limitador o por un fallo de I/O).
 *
 * @param {{ dir: string, throttleMs?: number, ahora?: () => number }} [opciones]
 */
export function crearRegistradorErrores(opciones) {
  const { dir, throttleMs = THROTTLE_MS_POR_DEFECTO, ahora = () => Date.now() } = opciones || {};
  if (!dir) throw new Error('crearRegistradorErrores requiere un directorio');

  const ultimos = new Map();

  return function registrar(origen, error) {
    try {
      const clave = claveError(origen, error);
      const t = ahora();
      const previo = ultimos.get(clave);
      if (previo !== undefined && t - previo < throttleMs) return false;
      ultimos.set(clave, t);

      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(path.join(dir, NOMBRE_ARCHIVO), formatearLinea(origen, error), 'utf8');
      return true;
    } catch {
      return false; // registrar nunca debe romper al llamador
    }
  };
}
