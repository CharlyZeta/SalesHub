import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  NOMBRE_ARCHIVO,
  claveError,
  crearRegistradorErrores,
  describirError,
  formatearLinea,
} from '../../server-error-log.js';

describe('FIX-ROBUST-001 · serverErrorLog', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saleshub-log-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('AC-004 rechazo registrado: escribe origen, fecha y stack en el archivo del log', () => {
    const registrar = crearRegistradorErrores({ dir });
    const escribio = registrar('unhandledRejection', new Error('promesa rota'));

    expect(escribio).toBe(true);
    const contenido = fs.readFileSync(path.join(dir, NOMBRE_ARCHIVO), 'utf8');
    expect(contenido).toContain('unhandledRejection');
    expect(contenido).toContain('promesa rota');
    expect(contenido).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  it('registra strings y objetos sin lanzar', () => {
    const registrar = crearRegistradorErrores({ dir });
    expect(registrar('static', 'ENOENT index.html')).toBe(true);
    expect(registrar('uncaughtException', { code: 'EACCES' })).toBe(true);

    const contenido = fs.readFileSync(path.join(dir, NOMBRE_ARCHIVO), 'utf8');
    expect(contenido).toContain('ENOENT index.html');
    expect(contenido).toContain('EACCES');
  });

  it('AF-01 limita el mismo error repetido para no inundar el disco', () => {
    let t = 1_000_000;
    const registrar = crearRegistradorErrores({ dir, throttleMs: 60_000, ahora: () => t });

    expect(registrar('static', new Error('mismo error'))).toBe(true);
    expect(registrar('static', new Error('mismo error'))).toBe(false); // dentro de la ventana
    t += 61_000;
    expect(registrar('static', new Error('mismo error'))).toBe(true); // pasó la ventana
  });

  it('distingue orígenes distintos aunque el mensaje sea igual', () => {
    const registrar = crearRegistradorErrores({ dir });
    expect(registrar('static', new Error('x'))).toBe(true);
    expect(registrar('uncaughtException', new Error('x'))).toBe(true);
  });

  it('nunca lanza si el directorio no se puede escribir', () => {
    // Un archivo donde debería ir el directorio: mkdir falla con ENOTDIR/EEXIST.
    const archivo = path.join(dir, 'bloqueado');
    fs.writeFileSync(archivo, 'x');
    const registrar = crearRegistradorErrores({ dir: path.join(archivo, 'sub') });

    expect(() => registrar('static', new Error('x'))).not.toThrow();
    expect(registrar('static', new Error('y'))).toBe(false);
  });

  it('helpers: describirError acota el stack y formatearLinea cierra con salto', () => {
    const largo = new Error('x'.repeat(9000));
    expect(describirError(largo).length).toBeLessThanOrEqual(4000);

    const linea = formatearLinea('origen', new Error('boom'), new Date('2026-11-05T12:00:00Z'));
    expect(linea.startsWith('[2026-11-05T12:00:00.000Z] origen')).toBe(true);
    expect(linea.endsWith('\n\n')).toBe(true);

    expect(claveError('origen', new Error('a\nb'))).toBe('origen:a');
  });
});
