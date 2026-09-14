# 🚀 SalesHub - Sistema Integral de Gestión de Ventas, Presupuestos y Omnicanalidad

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Code Coverage](https://img.shields.io/badge/Coverage-76%25-yellowgreen?style=for-the-badge&logo=vitest)](./src/__tests__)
[![CI](https://img.shields.io/github/actions/workflow/status/CharlyZeta/SalesHub/ci.yml?style=for-the-badge&logo=githubactions&logoColor=white&label=CI)](https://github.com/CharlyZeta/SalesHub/actions)
[![Node](https://img.shields.io/badge/Node-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![WooCommerce](https://img.shields.io/badge/WooCommerce-REST_API-96588A?style=for-the-badge&logo=woocommerce&logoColor=white)](https://woocommerce.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

Plataforma de alta velocidad para la gestión comercial omnicanal como herramienta de **front-office**. Diseñado bajo estándares de ingeniería de software para administrar ventas físicas e integraciones e-commerce (WooCommerce / MercadoLibre), emisión de presupuestos oficiales AFIP con conversión a venta, generación de remitos de transporte y entrega directa a clientes por **WhatsApp API (`wa.me`)** y **Correo Electrónico**.

---

![Dashboard Preview](./src/assets/images/app_dashboard_preview_1785184210800.jpg)
*Vista de la interfaz del sistema: Panel de analítica, planilla interactiva de ventas y gestor omnicanal de presupuestos y entregas.*

---

## 🎯 Objetivo del Proyecto y Visión General

El propósito principal del sistema es dotar al equipo comercial de la empresa de una herramienta unificada y responsiva que elimine la fricción operativa entre la venta en salón, la tienda e-commerce y el despacho logístico.

---

## 🔄 Complemento al ERP de la Firma

Este sistema **no reemplaza al ERP** de la empresa: actúa como su **herramienta comercial complementaria de captura y operación en el punto de venta**, cubriendo la fricción operativa diaria que el ERP central no resuelve:

| Proceso | Complemento comercial (este sistema) | ERP central |
| :--- | :--- | :--- |
| **Captura de venta** | Registro inmediato en salón con edición inline, canales múltiples y ticket promedio | Contabilidad y liquidación fiscal |
| **Presupuestos** | Cotización AFIP (IVA 21%, IIBB), conversión a venta en 1 clic y envío omnicanal | No es su foco operativo |
| **Remitos** | Generación de Remito X (no válido como factura) al momento del despacho | Emisión de facturación oficial |
| **Omnicanalidad** | Sincronización WooCommerce/MercadoLibre, WhatsApp (`wa.me`) y correo | Backend de tienda online |
| **Auditoría operativa** | Logs de trazabilidad de altas, modificaciones y conversiones | Auditoría contable/financiera |
| **Analítica comercial** | KPIs diarios, ticket promedio y canales en tiempo real | Reportes contables y de stock |

**Modelo de integración propuesto:** este sistema actúa como capa de front-office que alimenta al ERP mediante sus exportadores de datos (**CSV / JSON**), la **API de WooCommerce** (sincronización de catálogo y clientes) y la **API de WhatsApp / correo** para la distribución inmediata. Los datos transaccionales (ventas, presupuestos, remitos) pueden ser importados al ERP en lotes vía los archivos exportados o mediante la extensión de la capa de servicios.

### Flujo operativo front-office → ERP
```
Salón / Tienda online (venta, presupuesto, remito)
        │
        ▼
Sistema de Gestión Comercial (esta app)   ──►  Exportadores CSV / JSON
        │                                          API WooCommerce (catálogo/clientes)
        ▼
ERP CENTRAL (facturación, contabilidad, stock)
```

---

### Modelo de Datos Principal

Entidades tipadas en `src/types.ts` (Strict Typing Layer) que modelan el dominio comercial:

| Entidad | Descripción | Relaciones clave |
| :--- | :--- | :--- |
| `Sale` | Operación de venta con productos, descuentos, montos, canal, facturación condicional, datos de geolocalización y envío | 1..n `items`; 1 `Customer` |
| `Budget` | Presupuesto oficial AFIP convertible a venta | 1..n `items`; 1 `Customer`; → `Sale` (1:1) |
| `Customer` | Cliente del directorio con CUIT/DNI, teléfono, dirección por defecto (calle, localidad, provincia) e historial de compras | 1..n `Sale` / `Budget` |
| `CatalogProduct` | Producto del catálogo (local o WooCommerce) | 1..n ventas/presupuestos |
| `LogEntry` | Entrada de auditoría del sistema | eventos de todos los módulos |
| `ShippingStatus` | Estado de envío (Pendiente/En tránsito/Entregado) | 1 `Sale` |
| `UserRole` | Perfil RBAC (OPERADOR / ADMINISTRADOR) | control de acceso |

**Persistencia:** `localStorage` (claves `app_sales_v1`, `app_catalog_v1`, `app_budgets_v1`, `app_customers_v1`, `app_config_v1`, `app_woo_config_v1`, `app_theme`) con caché en el navegador — cero dependencia de servidor en operación. Las copias de seguridad se guardan en **IndexedDB** y en disco (`./backups` vía `server.js`), con **retención automática**: se conservan las 30 copias más recientes y nunca se eliminan las de menos de 7 días (`BACKUP_MAX_FILES` / `BACKUP_MIN_AGE_DAYS`, ver `.env.example`).

### Principales Problemas Resueltos:
1. **Desfragmentación de Canales**: Agrupa en una sola planilla interactiva las operaciones del local físico, transferencias bancarias, pedidos e-commerce de WooCommerce y ventas de MercadoLibre con badges visuales de color e íconos dinámicos.
2. **Ciclo de Cotización Ágil**: Permite confeccionar presupuestos profesionales con cálculo AFIP de IVA (21%), percepciones de Ingresos Brutos y bonificaciones, con la capacidad de convertirlos en una **Venta Real en 1 Clic** sin reingreso de datos.
3. **Distribución Omnicanal Inmediata**: Integración directa con la **API de WhatsApp (`wa.me`)** adaptada a la numeración argentina (`+54 9`) y cliente de correo electrónico para compartir presupuestos y ubicaciones geográficas de entrega con detalle de cliente y productos.
4. **Trazabilidad y Auditoría Completa**: Sistema de logs de auditoría en memoria y almacenamiento local que registra cada alta, modificación, conversión y sincronización de API.
5. **Localización y Logística Simplificada**: Geolocalización en mapa interactivo de OpenStreetMap sin costos de API, pin arrastrable para corrección exacta de coordenadas y plantilla de WhatsApp para transportistas y clientes.

---

## 🏗️ Arquitectura de Software y Decisiones de Diseño

El sistema ha sido estructurado siguiendo los principios **SOLID** y una arquitectura por capas desacoplada (*Modular Clean Architecture*), garantizando mantenibilidad, escalabilidad y una alta cobertura de pruebas automatizadas.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN (UI)                        │
│   React 19 + Tailwind CSS v4 + Lucide Icons + Recharts Analytics        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                  CAPA DE ESTADO & REACTIVIDAD LOCAL                     │
│    App.tsx (State Orchestrator) + LocalStorage Cache Persistence        │
└──────────────────┬─────────────────┬──────────────────┬─────────────────┘
                   │                 │                  │
┌──────────────────▼──────┐  ┌───────▼──────────┐  ┌────▼────────────────┐
│   LOGICA DE NEGOCIO     │  │ MÓDULO INTEGRACIÓN│  │ LOGS Y AUDITORÍA    │
│  • Presupuestos & AFIP  │  │ • WooCommerce API│  │ • Logger Engine     │
│  • Remitos de Despacho  │  │ • WhatsApp wa.me │  │ • Custom Event Bus  │
│  • Formateadores ARS    │  │ • Mailto RFC 6068│  │ • Exporter CSV/JSON │
│  • Mapas & Leaflet/OSM  │  │ • Geocoder API   │  │ • Backups Engine    │
└─────────────────────────┘  └──────────────────┘  └─────────────────────┘
```

### Principales Patrones Implementados:
- **Single Responsibility Principle (SRP)**: Cada componente modal (`BudgetModal`, `RemitoModal`, `SendBudgetModal`, `WooCommerceModal`, `SaleLocationMap`) y módulo de utilidad (`formatters.ts`, `budgetDelivery.ts`, `logger.ts`) posee una responsabilidad única y delimitada.
- **Fail-Safe & Graceful Degradation**: La API de WooCommerce implementa detección de fallos de red con simulador integrado para mantener la operatividad continua aun sin conexión a la tienda e-commerce.
- **Strict Typing Layer (`src/types.ts`)**: Tipado exhaustivo con interfaces explícitas para `Sale`, `Budget`, `Customer`, `CatalogProduct`, `LogEntry` y `ShippingStatus`.
- **Pure Functional Helpers**: Las funciones de cálculo financiero y formateo de texto (`numberToWords.ts`, `formatCurrency`, `formatWhatsAppPhone`) son puras y 100% probadas unitariamente.

---

## 🌟 Módulos y Funcionalidades del Sistema

### 1. 📊 Planilla Interactiva de Ventas (`SpreadsheetGrid`)
- Tabla de alta densidad inspirada en hojas de cálculo profesionales.
- Badges visuales con colores e íconos específicos por canal de comercialización (Local, WhatsApp, WooCommerce, MercadoLibre, Instagram, etc.) y método de pago (Efectivo, Transferencia, Débito, Crédito, MercadoPago, etc.).
- Edición *inline* en tiempo real para métodos de pago, canales de venta y estado del envío.
- Filtros dinámicos por mes de emisión y canal de comercialización.
- Acceso instantáneo a emisión de remitos y modificación de operaciones.

### 2. 📝 Registro Rápido de Ventas (`SaleFormModal`)
- Descuento individual (%) por línea de producto con recálculo dinámico en tiempo real del subtotal y total de venta.
- Facturación condicional: bloqueo automático para comprobantes "Sin Factura" y sugerencia de numeración correlativa (`A-0003-00000xxx` y `B-0003-0000xxxx`).
- Buscador interactivo de clientes existentes con despliegue al hacer foco y autocompletado de nombre, apellido, DNI/CUIT, teléfono y domicilio por defecto.
- Opción colapsable para envíos a domicilios alternativos y panel desplegable de mapa.

### 3. 🗺️ Localizador Geográfico y Mapas Interactivos (`SaleLocationMap`)
- Integración nativa de **Leaflet + OpenStreetMap** (100% gratuita, sin APIs de pago ni tarjetas de crédito).
- Geocodificación inteligente con **Nominatim** a partir del domicilio, localidad y provincia.
- **Pin Arrastrable (Draggable Marker)**: Permite ajustar y precisar con el puntero las coordenadas exactas de entrega en el mapa.
- **Compartir por WhatsApp**: Botón directo para enviar la ubicación en formato Google Maps (`https://www.google.com/maps?q=lat,lng`) junto con el nombre del cliente, domicilio, teléfono y lista de productos de la venta.

### 4. 💼 Gestor de Presupuestos & Cotizaciones (`BudgetModal`)
- Creación de presupuestos A/B con numeración correlativa (`PRES-0001-XXXXXX`).
- Buscador autocompletable de productos del catálogo y clientes agendados.
- Desglose oficial con IVA (21%), percepciones y descuentos globales.
- **Conversión en 1-Clic a Venta Real**: Transforma el presupuesto en una venta registrada asociando la factura B/A correspondiente.
- Vista previa e impresión en formato oficial PDF / A4.

### 5. 📱 Envíos Directos por WhatsApp & Correo Electrónico (`SendBudgetModal` & `budgetDelivery.ts`)
- **Procesamiento de Números Argentinos**: Normaliza automáticamente celulares locales (ej. `0342 154883135` → `5493424883135`) cumpliendo los estándares de la API internacional de WhatsApp (`wa.me`).
- Generación de mensajes enriquecidos con emojis, detalle ítem por ítem, importes y datos de la empresa configurada.
- Plantilla de Correo Electrónico lista con asunto oficial y cuerpo estructurado para envío vía `mailto:`.

### 6. 🚚 Remitos de Transporte & Despacho (`RemitoModal`)
- Generación e impresión de **Remito X - Documento No Válido como Factura**.
- Incluye datos del transporte/flete, dirección de entrega, desglose de bultos y espacio para firma de conformidad del receptor.

### 7. 🛒 Sincronizador WooCommerce (`WooCommerceModal` & `wooCommerceApi.ts`)
- Configuración de credenciales de API (Consumer Key / Consumer Secret).
- Sincronización bidireccional del catálogo de productos (precios, stock y SKUs).
- Importación automática de clientes de la tienda online al directorio local con extracción proactiva de CUIT/DNI y teléfonos secundarios desde `meta_data`.

### 8. 📈 Panel de Analítica Comercial (`AnalyticsModal` & `KpiSummary`)
- Métricas clave en tiempo real: Facturación mensual total, ticket promedio, total de ventas y canales destacados.
- Gráficos interactivos construidos con **Recharts**: Tendencia de ventas acumuladas y distribución porcentual por canal.

### 9. 📋 Auditoría y Registros de Sistema (`SystemLogsModal` & `logger.ts`)
- Registro cronológico de todos los eventos del sistema (`INFO`, `WARN`, `ERROR`, `SYNC`, `API`, `SALE`, `BUDGET`).
- Filtrado dinámico por nivel de log, categoría, fechas y cuadro de búsqueda en tiempo real.
- Exportación de auditoría en formato JSON y CSV.

---

## 🧪 Pruebas Automatizadas y Cobertura de Código

El proyecto cuenta con una suite completa de pruebas unitarias implementada con **Vitest** y **V8 Coverage Engine**.

### Resumen de Cobertura de Pruebas (reporte `npm run test:coverage`):
| Módulo | Cobertura de Sentencias | Cobertura de Líneas | Estado |
| :--- | :---: | :---: | :---: |
| `src/utils/numberToWords.ts` | **100%** | **100%** | PASSED |
| `src/utils/budgetDelivery.ts` | **97.2%** | **97.1%** | PASSED |
| `src/utils/security.ts` | **95.5%** | **94.6%** | PASSED |
| `src/utils/andreaniStatusMapper.ts` | **89.3%** | **88.9%** | PASSED |
| `src/utils/formatters.ts` | **88.5%** | **88.4%** | PASSED |
| `src/utils/logger.ts` | **88.5%** | **90.9%** | PASSED |
| `api-handlers.js` (capa de API) | **61.1%** | **61.2%** | PASSED |
| `src/utils/wooCommerceApi.ts` | **60.4%** | **60.5%** | PASSED |
| **TOTAL (módulos utils)** | **81.6%** | **81.1%** | **9/9 TEST SUITES PASSED (90/90 TESTS)** |
| **TOTAL global (incluye API)** | **76.0%** | **75.4%** | — |

> Nota: la cobertura mide la lógica pura (`src/utils`) y la capa de API
> (`api-handlers.js`) ejercitadas por los tests; los componentes de UI
> (`src/components`) aún no tienen tests unitarios. `wooCommerceApi.ts` concentra las
> líneas no cubiertas (rutas de fallback/simulación ante fallos de red).

### Ejecución de Pruebas:
```bash
# Ejecutar pruebas unitarias
npm run test

# Ejecutar pruebas con reporte de cobertura exhaustivo (Vitest + V8)
npm run test:coverage
```

---

## 🚀 Guía de Instalación y Ejecución Local

### Prerrequisitos:
- **Node.js**: v20.0.0 o superior (LTS recomendado)
- **npm**: v10.0.0 o superior

### Pasos de Instalación:

1. **Clonar el repositorio e instalar dependencias**:
   ```bash
   git clone https://github.com/CharlyZeta/SalesHub.git
   cd SalesHub
   npm install
   ```

2. **Iniciar el Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación se ejecutará automáticamente en `http://localhost:3000`.

   > **Modos de ejecución y recargas:** el dev server de Vite recarga la página cuando
   > detecta que se cortó su WebSocket (pestaña en segundo plano, suspensión de la PC o
   > reinicio del server) y también al aplicar cambios en archivos. Para carga de datos
   > real sin recargas:
   > - `npm run dev:stable` → levanta el dev server sin HMR ni watcher (menos recargas,
   >   pero el cliente de Vite sigue conectado),
   > - `npm run stable` → **compila y sirve el build de producción** (`server.js`), sin
   >   cliente de Vite: **cero recargas automáticas** (recomendado para operar).
   >
   > Además, el formulario de venta autoguarda un borrador: si la página se recarga igual,
   > al reabrir el modal se recupera la venta a medio cargar (con aviso y opción de descartar).
   >
   > **Datos de demostración:** por defecto una instalación nueva arranca **vacía** (sin
   > ventas/clientes de ejemplo). Para cargar los datos de ejemplo: `VITE_SEED_DEMO=true`
   > (ver `.env.example`).

3. **Verificar Calidad de Código (TypeScript Linter)**:
   ```bash
   npm run lint
   ```

4. **Compilar para Producción**:
   ```bash
   npm run build
   ```

5. **Servir en Producción (Node.js standalone)**:
   ```bash
   npm start   # node server.js  →  http://0.0.0.0:3000
   ```
   `server.js` sirve el build estático (`dist/`) **y** la capa de servicios
   (`/api/backup*` y `/api/tracking/andreani/*`), de modo que los backups en
   disco y el seguimiento de envíos Andreani funcionan también fuera del dev
   server. Configurable vía variables de entorno: `PORT`, `HOST` y `DIST_DIR`.
   La lógica de API es compartida con el dev server a través de `api-handlers.js`.

---

## 📁 Estructura del Proyecto

```
SalesHub/
├── .github/workflows/ci.yml  # Pipeline CI: typecheck + tests + build (GitHub Actions)
├── src/
│   ├── __tests__/            # Tests unitarios con Vitest (9 suites / 90 tests)
│   │   ├── andreaniStatusMapper.test.ts
│   │   ├── apiHandlers.test.ts         # API de backups/tracking y rotación
│   │   ├── budgetDelivery.test.ts
│   │   ├── budgetSaleLogic.test.ts
│   │   ├── formatters.test.ts
│   │   ├── logger.test.ts
│   │   ├── numberToWords.test.ts
│   │   ├── security.test.ts
│   │   └── wooCommerceApi.test.ts
│   ├── assets/images/        # Capturas e imágenes promocionales
│   ├── components/           # Componentes UI encapsulados (uno por responsabilidad)
│   │   ├── AnalyticsModal.tsx
│   │   ├── AuthModal.tsx               # Auth Gate: PIN, roles RBAC y bloqueo progresivo
│   │   ├── BudgetModal.tsx             # Presupuestos AFIP + conversión a venta
│   │   ├── ConfigModal.tsx             # Shell del modal de configuración
│   │   ├── ConfigBackupsTab.tsx        # Pestaña: copias de seguridad
│   │   ├── ConfigEmpresaTab.tsx        # Pestaña: empresa / firma
│   │   ├── ConfigGeneralTab.tsx        # Pestaña: canales, pagos, envíos, Andreani
│   │   ├── ConfigSecurityTab.tsx       # Pestaña: seguridad & PIN
│   │   ├── CustomerDirectoryModal.tsx
│   │   ├── ExportModal.tsx
│   │   ├── Header.tsx
│   │   ├── ImportModal.tsx
│   │   ├── KpiSummary.tsx
│   │   ├── ProductSearchPicker.tsx     # Buscador autocompletable de catálogo
│   │   ├── RemitoModal.tsx
│   │   ├── SaleFormModal.tsx
│   │   ├── SaleLocationMap.tsx         # Mapa Leaflet/OSM + pin arrastrable
│   │   ├── SendBudgetModal.tsx
│   │   ├── SpreadsheetGrid.tsx
│   │   ├── SystemLogsModal.tsx
│   │   └── WooCommerceModal.tsx
│   ├── data/                 # Datos iniciales y semillas de prueba
│   │   └── initialData.ts
│   ├── utils/                # Utilidades puras y lógica de negocio
│   │   ├── andreaniStatusMapper.ts     # Mapeo canónico de estados Andreani
│   │   ├── andreaniSyncService.ts      # Auto-seguimiento reactivo de envíos
│   │   ├── backupService.ts            # Backups IndexedDB + disco (API /api/backup)
│   │   ├── budgetDelivery.ts
│   │   ├── formatters.ts
│   │   ├── logger.ts                   # Motor de auditoría (localStorage + eventos)
│   │   ├── numberToWords.ts
│   │   ├── security.ts                 # Hash de PIN (SHA-256) y bloqueo progresivo
│   │   └── wooCommerceApi.ts
│   ├── App.tsx               # Orquestador principal de estado
│   ├── main.tsx              # Punto de entrada Vite React
│   ├── types.ts              # Contratos e interfaces de TypeScript
│   └── index.css             # Estilos globales con Tailwind CSS v4
├── api-handlers.js           # Handlers de API compartidos (dev server + server.js)
├── docs/FIXES.md             # Registro de correcciones aplicadas y deuda pendiente
├── metadata.json             # Metadatos del applet en AI Studio
├── package.json              # Dependencias y scripts de compilación
├── server.js                 # Servidor de producción Node.js (dist/ + APIs /api/*)
├── tsconfig.json             # Configuración del compilador de TypeScript
└── vite.config.ts            # Configuración de empaquetado Vite
```

---

## 🔒 Guía Completa de Seguridad y Despliegue en VPS (Subdominio WooCommerce)

Para poner este sistema en producción en el subdominio **`gestion.miempresa.com.ar`** en el mismo VPS donde reside la tienda principal **`miempresa.com.ar`** (WooCommerce / WordPress), se presentan **4 niveles de seguridad integrados**:

### 1. 🛡️ Capa de Aplicación: PIN de Bloqueo y Control de Roles (RBAC)
El sistema incluye un gestor de seguridad integrado en el cliente React:
- **Pantalla de Bloqueo (Auth Gate)**: Exige el PIN configurado para desbloquear la aplicación. Al habilitar la seguridad por primera vez se debe fijar un PIN propio (el PIN predeterminado `1234` de fábrica no es admitido).
- **Perfiles de Acceso (RBAC)**:
  - **Operador**: Registro de ventas, confección de presupuestos, remitos e historial de clientes.
  - **Administrador**: Acceso completo, edición de API Keys de WooCommerce, purga de logs de auditoría y cambio de parámetros.
- **Auto-Bloqueo por Inactividad**: Temporizador configurable (5, 15, 30 o 60 min) que bloquea la sesión automáticamente tras detectar inactividad.
- **Auth Gate al iniciar la aplicación**: con la seguridad habilitada, la app arranca bloqueada pidiendo el PIN (no solo ante bloqueos manuales o por inactividad).
- **Bloqueo progresivo ante intentos fallidos**: tras 3 intentos fallidos el login se bloquea 5 s, tras 5 por 30 s y desde 7 por 60 s (contador persistente en `sessionStorage`).
- **PIN nunca en claro**: solo se persiste el hash (SHA-256). Al habilitar la seguridad no se admite el PIN predeterminado `1234`: se exige fijar un PIN nuevo.

---

### 2. 🔑 Capa Nginx VPS: Autenticación HTTP Basic Auth
Para impedir que usuarios no autorizados descarguen el paquete de la aplicación antes de autenticarse:

```nginx
# En el archivo de configuración de Nginx (/etc/nginx/sites-available/gestion.miempresa.com.ar)
server {
    server_name gestion.miempresa.com.ar;

    location / {
        proxy_pass http://127.0.0.1:3000; # server.js (npm start): sirve dist/ y las APIs /api/*
        auth_basic "Acceso Restringido";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```
*Para crear las credenciales en el VPS:* `sudo htpasswd -c /etc/nginx/.htpasswd admin`

---

### 3. 🌐 Capa SSL/TLS & Encabezados de Seguridad (Certbot + HSTS)
Asegura la comunicación cifrada con la tienda WooCommerce en el mismo servidor:

```nginx
# Cifrado SSL mediante Let's Encrypt Certbot
server {
    listen 443 ssl http2;
    server_name gestion.miempresa.com.ar;

    ssl_certificate /etc/letsencrypt/live/gestion.miempresa.com.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gestion.miempresa.com.ar/privkey.pem;

    # Headers de Seguridad Estricta
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

### 4. 🎯 Capa de Red: Restricción por Dirección IP en Nginx
Permite limitar el acceso al subdominio únicamente desde las IPs estáticas del local u oficinas de la empresa:

```nginx
location / {
    allow 200.55.120.45; # IP Fija Oficina
    allow 190.210.88.12; # IP Fija Depósito
    deny all;
}
```

---

## 🔒 Licencia y Autor

Desarrollado por **Gerardo Maidana** — gerardomaidana@outlook.com

Licencia MIT © 2026 Gerardo Maidana — ver [`LICENSE`](./LICENSE).
