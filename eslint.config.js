import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Ignora artefactos, dependencias y archivos de infraestructura fuera del alcance.
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'backups/**',
      'andreani-shipping/**',
      'graphify-out/**',
      '.agents/**',
      '.superpowers/**',
      '*.log',
      'eslint.config.js',
      '.prettierrc*',
      // JS de infraestructura raíz (servidor Node / Vite): se excluyen del scope
      // por ahora (usan globals de Node no declarados en este config flat).
      'server.js',
      'api-handlers.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Reglas de hooks de React (Rules of Hooks).
      ...reactHooks.configs.recommended.rules,

      // Deuda tipada: `any` explícito se desactiva como error para no forzar un
      // refactor masivo; el objetivo es irlos migrando de a uno.
      '@typescript-eslint/no-explicit-any': 'off',
      // Convención: variables/args con prefijo `_` son intencionalmente no usados.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Reglas nuevas/experimentales del plugin react-hooks v6 (ruido > señal hoy).
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      // Asignación inútil: análisis conservador; se desactiva (estilo).
      'no-useless-assignment': 'off',
      // Permite catch vacíos sin comentario (convención de fallbacks silenciosos).
      'no-empty': ['error', { allowEmptyCatch: true }],
      // exhaustive-deps: warning informativo (no bloquea refactors de efectos).
      'react-hooks/exhaustive-deps': 'warn',
      // Permitir archivos que exportan más que componentes (modales + helpers).
      'react-refresh/only-export-components': 'off',
    },
  },

  // Reglas de estilo delegadas a Prettier: desactivar conflictos de formato.
  prettierConfig,
);
