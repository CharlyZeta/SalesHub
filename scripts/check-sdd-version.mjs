#!/usr/bin/env node
/**
 * Diagnóstico y verificación de versiones de SDD-GL.
 *
 * Chequea la versión del framework SDD-GL local y si existen nuevas
 * versiones o actualizaciones en el repositorio oficial.
 *
 * Uso: npm run sdd:check
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const LOCAL_SDD_REPO = process.env.SDD_GL_PATH || 'e:/Propios/SDD-GL/sdd-gl-repo';
const SDD_REMOTE_URL = 'https://github.com/CharlyZeta/SDD-GL.git';

console.log('\n📐 Verificación de Protocolo SDD-GL');
console.log('-----------------------------------');

let currentVersion = 'desconocida';
let hasLocalRepo = false;

// 1. Verificar instalación / repositorio local del protocolo
if (fs.existsSync(LOCAL_SDD_REPO)) {
  hasLocalRepo = true;
  const pluginFile = path.join(LOCAL_SDD_REPO, 'plugin.json');
  if (fs.existsSync(pluginFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(pluginFile, 'utf8'));
      currentVersion = data.version || '0.3.0';
    } catch {
      currentVersion = '0.3.0 (fallback)';
    }
  }
  console.log(`✅ Repositorio local SDD-GL detectado: ${LOCAL_SDD_REPO}`);
  console.log(`📌 Versión activa instalada: v${currentVersion}`);
} else {
  console.log(`⚠️ Repositorio local SDD-GL no encontrado en: ${LOCAL_SDD_REPO}`);
}

// 2. Comprobar si hay actualizaciones remotas
try {
  // Verificamos el último commit en master de forma ligera
  const remoteOutput = execSync(`git ls-remote --heads ${SDD_REMOTE_URL} master`, {
    timeout: 4000,
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
  }).trim();

  const remoteCommit = remoteOutput ? remoteOutput.split(/\s+/)[0] : null;

  if (hasLocalRepo && remoteCommit) {
    try {
      const localCommit = execSync(`git -C "${LOCAL_SDD_REPO}" rev-parse HEAD`, {
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf8',
      }).trim();

      if (localCommit === remoteCommit) {
        console.log(`✅ SDD-GL está al día con el origen remoto (${localCommit.slice(0, 7)})`);
      } else {
        console.log(`🔔 ¡Nueva actualización remota disponible en SDD-GL!`);
        console.log(`   Local:  ${localCommit.slice(0, 7)}`);
        console.log(`   Remoto: ${remoteCommit.slice(0, 7)}`);
        console.log(`   Ejecuta: git -C "${LOCAL_SDD_REPO}" pull`);
      }
    } catch {
      console.log(`ℹ️ No se pudo leer el HEAD local de SDD-GL.`);
    }
  } else if (remoteCommit) {
    console.log(`🌐 Repositorio remoto accesible (${remoteCommit.slice(0, 7)})`);
  }
} catch {
  console.log('ℹ️ Chequeo remoto omitido (sin conexión rápida o timeout)');
}

console.log('-----------------------------------\n');
