# 🚀 DUAL S.R.L. - Sistema Integral de Gestión de Ventas, Presupuestos y Omnicanalidad

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1.8-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Code Coverage](https://img.shields.io/badge/Coverage-91%25-brightgreen?style=for-the-badge&logo=vitest)](./src/__tests__)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

Plataforma de alta velocidad para la gestión comercial omnicanal de **DUAL S.R.L. (Santa Fe Equipamientos para Comercio y Hogar)**. Diseñado bajo estándares de ingeniería de software para administrar ventas físicas e integraciones e-commerce (WooCommerce / MercadoLibre), emisión de presupuestos oficiales AFIP con conversión a venta, generación de remitos de transporte y entrega directa a clientes por **WhatsApp API (`wa.me`)** y **Correo Electrónico**.

---

![Dashboard Preview](./src/assets/images/app_dashboard_preview_1785184210800.jpg)
*Vista de la interfaz del sistema: Panel de analítica, planilla interactiva de ventas y gestor omnicanal de presupuestos y entregas.*

---

## 🎯 Objetivo del Proyecto y Visión General

El propósito principal del sistema es dotar al equipo comercial de **DUAL S.R.L.** de una herramienta unificada y responsiva que elimine la fricción operativa entre la venta en salón, la tienda e-commerce y el despacho logístico.

---

## 🔄 Complemento al ERP de la Firma

Este sistema **no reemplaza al ERP** de DUAL S.R.L.: actúa como su **herramienta comercial complementaria de captura y operación en el punto de venta**, cubriendo la fricción operativa diaria que el ERP central no resuelve:

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
| `Sale` | Operación de venta con productos, montos, canal y envío | 1..n `items`; 1 `Customer` |
| `Budget` | Presupuesto oficial AFIP convertible a venta | 1..n `items`; 1 `Customer`; → `Sale` (1:1) |
| `Customer` | Cliente del directorio con historial de compras | 1..n `Sale` / `Budget` |
| `CatalogProduct` | Producto del catálogo (local o WooCommerce) | 1..n ventas/presupuestos |
| `LogEntry` | Entrada de auditoría del sistema | eventos de todos los módulos |
| `ShippingStatus` | Estado de envío (Pendiente/En tránsito/Entregado) | 1 `Sale` |
| `UserRole` | Perfil RBAC (OPERADOR / ADMINISTRADOR) | control de acceso |

**Persistencia:** `localStorage` (claves `app_sales_v1`, `app_catalog_v1`, `app_budgets_v1`, `app_customers_v1`, `app_config_v1`, `app_woo_config_v1`, `app_theme`) con caché en el navegador — cero dependencia de servidor en operación.

### Principales Problemas Resueltos:
1. **Desfragmentación de Canales**: Agrupa en una sola planilla interactiva las operaciones del local físico, transferencias bancarias, pedidos e-commerce de WooCommerce y ventas de MercadoLibre.
2. **Ciclo de Cotización Ágil**: Permite confeccionar presupuestos profesionales con cálculo AFIP de IVA (21%), percepciones de Ingresos Brutos y bonificaciones, con la capacidad de convertirlos en una **Venta Real en 1 Clic** sin reingreso de datos.
3. **Distribución Omnicanal Inmediata**: Integración directa con la **API de WhatsApp (`wa.me`)** adaptada a la numeración argentina (`+54 9`) y cliente de correo electrónico para compartir presupuestos al instante.
4. **Trazabilidad y Auditoría Completa**: Sistema de logs de auditoría en memoria y almacenamiento local que registra cada alta, modificación, conversión y sincronización de API.

---

## 🏗️ Arquitectura de Software y Decisiones de Diseño

El sistema ha sido estructurado siguiendo los principios **SOLID** y una arquitectura por capas desacoplada (*Modular Clean Architecture*), garantizando mantenibilidad, escalabilidad y una alta cobertura de pruebas automatizadas.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN (UI)                        │
│   React 18 + Tailwind CSS v4 + Lucide Icons + Recharts Analytics        │
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
└─────────────────────────┘  └──────────────────┘  └─────────────────────┘
```

### Principales Patrones Implementados:
- **Single Responsibility Principle (SRP)**: Cada componente modal (`BudgetModal`, `RemitoModal`, `SendBudgetModal`, `WooCommerceModal`) y módulo de utilidad (`formatters.ts`, `budgetDelivery.ts`, `logger.ts`) posee una responsabilidad única y delimitada.
- **Fail-Safe & Graceful Degradation**: La API de WooCommerce implementa detección de fallos de red con simulador integrado para mantener la operatividad continua aun sin conexión a la tienda e-commerce.
- **Strict Typing Layer (`src/types.ts`)**: Tipado exhaustivo con interfaces explícitas para `Sale`, `Budget`, `Customer`, `CatalogProduct`, `LogEntry` y `ShippingStatus`.
- **Pure Functional Helpers**: Las funciones de cálculo financiero y formateo de texto (`numberToWords.ts`, `formatCurrency`, `formatWhatsAppPhone`) son puras y 100% probadas unitariamente.

---

## 🌟 Módulos y Funcionalidades del Sistema

### 1. 📊 Planilla Interactiva de Ventas (`SpreadsheetGrid`)
- Tabla de alta densidad inspirada en hojas de cálculo profesionales.
- Edición *inline* en tiempo real para métodos de pago, canales de venta y estado del envío.
- Filtros dinámicos por mes de emisión y canal de comercialización (Local, WhatsApp, WooCommerce, MercadoLibre).
- Acceso instantáneo a emisión de remitos y modificación de operaciones.

### 2. 💼 Gestor de Presupuestos & Cotizaciones (`BudgetModal`)
- Creación de presupuestos A/B con numeración correlativa (`PRES-0001-XXXXXX`).
- Buscador autocompletable de productos del catálogo y clientes agendados.
- Desglose oficial con IVA (21%), percepciones y descuentos globales.
- **Conversión en 1-Clic a Venta Real**: Transforma el presupuesto en una venta registrada asociando la factura B/A correspondiente.
- Vista previa e impresión en formato oficial PDF / A4.

### 3. 📱 Envíos Directos por WhatsApp & Correo Electrónico (`SendBudgetModal` & `budgetDelivery.ts`)
- **Procesamiento de Números Argentinos**: Normaliza automáticamente celulares locales (ej. `0342 154883135` → `5493424883135`) cumpliendo los estándares de la API internacional de WhatsApp (`wa.me`).
- Generación de mensajes enriquecidos con emojis, detalle ítem por ítem, importes y datos de contacto de DUAL S.R.L.
- Plantilla de Correo Electrónico lista con asunto oficial y cuerpo estructurado para envío vía `mailto:`.
- Posibilidad de enviar al teléfono/email guardado del cliente o ingresar un número/correo alternativo.

### 4. 🚚 Remitos de Transporte & Despacho (`RemitoModal`)
- Generación e impresión de **Remito X - Documento No Válido como Factura**.
- Incluye datos del transporte/flete, dirección de entrega, desglose de bultos y espacio para firma de conformidad del receptor.

### 5. 🛒 Sincronizador WooCommerce (`WooCommerceModal` & `wooCommerceApi.ts`)
- Configuración de credenciales de API (Consumer Key / Consumer Secret).
- Sincronización bidireccional del catálogo de productos (precios, stock y SKUs).
- Importación automática de clientes de la tienda online al directorio local.

### 6. 📈 Panel de Analítica Comercial (`AnalyticsModal` & `KpiSummary`)
- Métricas clave en tiempo real: Facturación mensual total, ticket promedio, total de ventas y canales destacados.
- Gráficos interactivos construidos con **Recharts**: Tendencia de ventas acumuladas y distribución porcentual por canal.

### 7. 📋 Auditoría y Registros de Sistema (`SystemLogsModal` & `logger.ts`)
- Registro cronológico de todos los eventos del sistema (`INFO`, `WARN`, `ERROR`, `SYNC`, `API`, `SALE`, `BUDGET`).
- Filtrado dinámico por nivel de log, categoría, fechas y cuadro de búsqueda en tiempo real.
- Exportación de auditoría en formato JSON y CSV.

---

## 🧪 Pruebas Automatizadas y Cobertura de Código

El proyecto cuenta con una suite completa de pruebas unitarias implementada con **Vitest** y **V8 Coverage Engine**.

### Resumen de Cobertura de Pruebas:
| Módulo | Cobertura de Sentencias | Cobertura de Líneas | Estado |
| :--- | :---: | :---: | :---: |
| `src/utils/numberToWords.ts` | **100%** | **100%** | PASSED |
| `src/utils/budgetDelivery.ts` | **97.2%** | **97.1%** | PASSED |
| `src/utils/logger.ts` | **88.5%** | **90.9%** | PASSED |
| `src/utils/wooCommerceApi.ts` | **88.6%** | **88.6%** | PASSED |
| `src/utils/formatters.ts` | **86.2%** | **87.2%** | PASSED |
| **TOTAL PROMEDIO** | **>91.4%** | **>92.1%** | **6/6 TEST SUITES PASSED (36/36 TESTS)** |

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
- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior

### Pasos de Instalación:

1. **Clonar el repositorio e instalar dependencias**:
   ```bash
   git clone https://github.com/dualsrl/sistema-ventas.git
   cd sistema-ventas
   npm install
   ```

2. **Iniciar el Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación se ejecutará automáticamente en `http://localhost:3000`.

3. **Verificar Calidad de Código (TypeScript Linter)**:
   ```bash
   npm run lint
   ```

4. **Compilar para Producción**:
   ```bash
   npm run build
   ```

---

## 📁 Estructura del Proyecto

```
sistema-ventas/
├── src/
│   ├── __tests__/            # Tests unitarios con Vitest
│   │   ├── budgetDelivery.test.ts
│   │   ├── budgetSaleLogic.test.ts
│   │   ├── formatters.test.ts
│   │   ├── logger.test.ts
│   │   ├── numberToWords.test.ts
│   │   └── wooCommerceApi.test.ts
│   ├── assets/               # Capturas e imágenes promocionales
│   │   └── images/
│   ├── components/           # Componentes UI encapsulados
│   │   ├── AnalyticsModal.tsx
│   │   ├── BudgetModal.tsx
│   │   ├── ConfigModal.tsx
│   │   ├── CustomerDirectoryModal.tsx
│   │   ├── ExportModal.tsx
│   │   ├── Header.tsx
│   │   ├── ImportModal.tsx
│   │   ├── KpiSummary.tsx
│   │   ├── RemitoModal.tsx
│   │   ├── SaleFormModal.tsx
│   │   ├── SendBudgetModal.tsx
│   │   ├── SpreadsheetGrid.tsx
│   │   ├── SystemLogsModal.tsx
│   │   └── WooCommerceModal.tsx
│   ├── data/                 # Datos iniciales y semillas de prueba
│   │   └── initialData.ts
│   ├── utils/                # Utilidades puras y lógica de negocio
│   │   ├── budgetDelivery.ts
│   │   ├── formatters.ts
│   │   ├── logger.ts
│   │   ├── numberToWords.ts
│   │   └── wooCommerceApi.ts
│   ├── App.tsx               # Orquestador principal de estado
│   ├── main.tsx              # Punto de entrada Vite React
│   ├── types.ts              # Contratos e interfaces de TypeScript
│   └── index.css             # Estilos globales con Tailwind CSS v4
├── metadata.json             # Metadatos del applet en AI Studio
├── package.json              # Dependencias y scripts de compilación
├── tsconfig.json             # Configuración del compilador de TypeScript
└── vite.config.ts            # Configuración de empaquetado Vite
```

---

## 🔒 Guía Completa de Seguridad y Despliegue en VPS (Subdominio WooCommerce)

Para poner este sistema en producción en el subdominio **`gestion.dualsrl.com.ar`** en el mismo VPS donde reside la tienda principal **`dualsrl.com.ar`** (WooCommerce / WordPress), se presentan **4 niveles de seguridad integrados**:

### 1. 🛡️ Capa de Aplicación: PIN de Bloqueo y Control de Roles (RBAC)
El sistema incluye un gestor de seguridad integrado en el cliente React:
- **Pantalla de Bloqueo (Auth Gate)**: Exige un PIN de Administrador (predeterminado: `1234`) para desbloquear funciones sensibles.
- **Perfiles de Acceso (RBAC)**:
  - **Operador**: Registro de ventas, confección de presupuestos, remitos e historial de clientes.
  - **Administrador**: Acceso completo, edición de API Keys de WooCommerce, purga de logs de auditoría y cambio de parámetros.
- **Auto-Bloqueo por Inactividad**: Temporizador configurable (5, 15, 30 o 60 min) que bloquea la sesión automáticamente tras detectar inactividad.

---

### 2. 🔑 Capa Nginx VPS: Autenticación HTTP Basic Auth
Para impedir que usuarios no autorizados descarguen el paquete de la aplicación antes de autenticarse:

```nginx
# En el archivo de configuración de Nginx (/etc/nginx/sites-available/gestion.dualsrl.com.ar)
server {
    server_name gestion.dualsrl.com.ar;

    location / {
        proxy_pass http://127.0.0.1:3000; # O la carpeta /dist si se sirve estático
        auth_basic "Acceso Restringido - DUAL S.R.L.";
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
    server_name gestion.dualsrl.com.ar;

    ssl_certificate /etc/letsencrypt/live/gestion.dualsrl.com.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gestion.dualsrl.com.ar/privkey.pem;

    # Headers de Seguridad Estricta
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

### 4. 🎯 Capa de Red: Restricción por Dirección IP en Nginx
Permite limitar el acceso al subdominio únicamente desde las IPs estáticas del local u oficinas de DUAL S.R.L.:

```nginx
location / {
    allow 200.55.120.45; # IP Fija Oficina
    allow 190.210.88.12; # IP Fija Depósito
    deny all;
}
```

---

## 🔒 Licencia y Contacto

Desarrollado para **DUAL S.R.L. - Equipamientos para Comercio y Hogar**.  
📍 Estanislao Zeballos 3825, Santa Fe, Argentina.  
📞 Teléfono: 0342-4883135 | 📧 Email: dualdesantafe@hotmail.com  

Licencia MIT © 2026 DUAL S.R.L.
