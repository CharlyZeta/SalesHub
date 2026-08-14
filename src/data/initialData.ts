import { Sale, CatalogProduct, Customer, WooCommerceConfig, AppConfig, Budget } from '../types';

// Utility to generate recent dates
const today = new Date();
const formatDateIso = (daysAgo: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const INITIAL_CONFIG: AppConfig = {
  canales: ['Local', 'MercadoLibre', 'WooCommerce', 'WhatsApp', 'Instagram', 'Venta Telefónica', 'Otro'],
  metodosPago: ['Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'MercadoPago', 'Efectivo contra entrega', 'Cheque / eCheq', 'Otro'],
  metodosEnvio: ['Retiro en Local', 'Correo Argentino', 'Andreani', 'OCA', 'Cadetería / Moto', 'Mercado Envíos', 'Otro'],
  estadosEnvio: ['Pendiente', 'Enviado', 'Entregado', 'No Requiere'],
  ultimoNumeroPresupuesto: 311,
  puntoVentaPresupuesto: '0001',
  seguridad: {
    seguridadHabilitada: false,
    pinAcceso: '1234',
    tiempoInactividadMinutos: 15,
    modoProduccionVPS: false,
    bloquearSincronizacionWooCommerce: false,
    bloquearBorradoLogs: false,
    rolActual: 'ADMIN'
  }
};

export const INITIAL_BUDGETS: Budget[] = [
  {
    id: 'PRE-00000311',
    numeroPresupuesto: 'P0001-00000311',
    puntoVenta: '0001',
    comprobanteNumero: '00000311',
    fechaEmision: '2024-05-13',
    esClienteAgendado: false,
    razonSocialNombre: '0-CONSUMIDOR FINAL',
    apellido: '',
    dniCuit: '1',
    domicilio: '.-, .',
    telefono: '4883135',
    codigoPostal: '3000',
    condicionFiscal: 'CONSUMIDOR FINAL',
    condicionVenta: 'CONTADO',
    items: [
      {
        id: 'item-1',
        descripcion: 'ANAFE 6 HORNALLAS LINEA ECO',
        cantidad: 1,
        precioUnitario: 310900,
        descuentoPorcentaje: 0,
        subtotal: 310900
      }
    ],
    subtotal: 310900,
    descuentoTotal: 0,
    percepciones: 0,
    importeTotal: 310900,
    observaciones: 'Presupuesto de muestra conforme archivo adjunto.',
    estado: 'Pendiente',
    creadoEn: new Date().toISOString()
  }
];


export const INITIAL_SALES: Sale[] = [
  {
    id: 'V-2026-089',
    fecha: formatDateIso(0),
    clienteId: 'CLI-1001',
    clienteNombre: 'Gonzalo',
    clienteApellido: 'Fernández',
    clienteEmail: 'gonzalo.f@gmail.com',
    clienteTelefono: '11-5491-8821',
    clienteDniCuit: '20-38491029-4',
    productos: [
      { id: 'p1', nombre: 'Taladro Percutor Inalámbrico 20V Heavy Duty', cantidad: 1, precioUnitario: 145000, subtotal: 145000 },
      { id: 'p2', nombre: 'Set de Mechas Cobalto x13 unid', cantidad: 1, precioUnitario: 28500, subtotal: 28500 }
    ],
    montoTotal: 173500,
    numeroFactura: 'FC-B-0002-00004510',
    tipoFactura: 'Factura B',
    metodoPago: 'MercadoPago',
    canal: 'MercadoLibre',
    metodoEnvio: 'Mercado Envíos',
    numeroSeguimiento: 'ME-9482019482',
    estadoEnvio: 'Enviado',
    notas: 'Etiqueta impagable de ML lista.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-088',
    fecha: formatDateIso(0),
    clienteId: 'CLI-1008',
    clienteNombre: 'Mariana',
    clienteApellido: 'Rossi',
    clienteEmail: 'marianarossi@hotmail.com',
    clienteTelefono: '342-4591029',
    clienteDniCuit: '27-33104928-1',
    productos: [
      { id: 'p3', nombre: 'Atornillador de Impacto Brushless 18V', cantidad: 1, precioUnitario: 189000, subtotal: 189000 }
    ],
    montoTotal: 189000,
    numeroFactura: 'FC-A-0002-00001042',
    tipoFactura: 'Factura A',
    metodoPago: 'Transferencia',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    numeroSeguimiento: '',
    estadoEnvio: 'Entregado',
    notas: 'Retiró en mostrador de 10 a 12hs.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-087',
    fecha: formatDateIso(1),
    clienteId: 'CLI-1003',
    clienteNombre: 'Esteban',
    clienteApellido: 'Gómez',
    clienteEmail: 'esteban_g@yahoo.com.ar',
    clienteTelefono: '341-8849102',
    clienteDniCuit: '20-29184019-3',
    productos: [
      { id: 'p4', nombre: 'Amoladora Angular 4 1/2" 850W Pro', cantidad: 2, precioUnitario: 82000, subtotal: 164000 }
    ],
    montoTotal: 164000,
    numeroFactura: 'FC-B-0002-00004509',
    tipoFactura: 'Factura B',
    metodoPago: 'Tarjeta de Crédito',
    canal: 'WooCommerce',
    metodoEnvio: 'Andreani',
    numeroSeguimiento: 'AND-88392019',
    estadoEnvio: 'Enviado',
    notas: 'Enviado con seguro asignado.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-086',
    fecha: formatDateIso(2),
    clienteId: 'CLI-1012',
    clienteNombre: 'Roberto',
    clienteApellido: 'Martínez',
    clienteEmail: 'martinez_construcciones@gmail.com',
    clienteTelefono: '11-3920-1928',
    clienteDniCuit: '30-71940192-8',
    productos: [
      { id: 'p5', nombre: 'Sierra Sensitiva 14" 2200W Profesional', cantidad: 1, precioUnitario: 320000, subtotal: 320000 },
      { id: 'p6', nombre: 'Disco de Corte Sensitiva 14" x3', cantidad: 2, precioUnitario: 14500, subtotal: 29000 }
    ],
    montoTotal: 349000,
    numeroFactura: 'FC-A-0002-00001041',
    tipoFactura: 'Factura A',
    metodoPago: 'Transferencia',
    canal: 'Local',
    metodoEnvio: 'Cadetería / Moto',
    numeroSeguimiento: 'CAD-042',
    estadoEnvio: 'Entregado',
    notas: 'Pago de contado con bonificación por volumen.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-085',
    fecha: formatDateIso(3),
    clienteId: 'CLI-1005',
    clienteNombre: 'Lucía',
    clienteApellido: 'Alvarez',
    clienteEmail: 'lucia.alvarez@outlook.com',
    clienteTelefono: '342-9982019',
    clienteDniCuit: '27-39102948-5',
    productos: [
      { id: 'p7', nombre: 'Juego de Herramientas Manuales 108 pzas', cantidad: 1, precioUnitario: 112000, subtotal: 112000 }
    ],
    montoTotal: 112000,
    numeroFactura: 'FC-B-0002-00004508',
    tipoFactura: 'Factura B',
    metodoPago: 'MercadoPago',
    canal: 'MercadoLibre',
    metodoEnvio: 'Mercado Envíos',
    numeroSeguimiento: 'ME-8849201912',
    estadoEnvio: 'Entregado',
    notas: 'Cliente consultó previamente por cuotas.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-084',
    fecha: formatDateIso(4),
    clienteId: 'CLI-1020',
    clienteNombre: 'Carlos',
    clienteApellido: 'Benítez',
    clienteEmail: 'cbenitez@electrosrl.com',
    clienteTelefono: '11-4019-3829',
    clienteDniCuit: '30-68920194-2',
    productos: [
      { id: 'p8', nombre: 'Soldadora Inverter 180A con Máscara Fotosensible', cantidad: 1, precioUnitario: 245000, subtotal: 245000 }
    ],
    montoTotal: 245000,
    numeroFactura: 'FC-A-0002-00001040',
    tipoFactura: 'Factura A',
    metodoPago: 'Transferencia',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    numeroSeguimiento: '',
    estadoEnvio: 'Entregado',
    notas: 'Cliente frecuente, saldo pendiente regularizado.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-083',
    fecha: formatDateIso(6),
    clienteId: 'CLI-1015',
    clienteNombre: 'Valeria',
    clienteApellido: 'Pérez',
    clienteEmail: 'valeria.p@gmail.com',
    clienteTelefono: '341-9920194',
    clienteDniCuit: '27-35910293-9',
    productos: [
      { id: 'p1', nombre: 'Taladro Percutor Inalámbrico 20V Heavy Duty', cantidad: 1, precioUnitario: 145000, subtotal: 145000 }
    ],
    montoTotal: 145000,
    numeroFactura: 'FC-B-0002-00004507',
    tipoFactura: 'Factura B',
    metodoPago: 'Efectivo',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    numeroSeguimiento: '',
    estadoEnvio: 'Entregado',
    notas: 'Abonado en caja central.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-082',
    fecha: formatDateIso(8),
    clienteId: 'CLI-1001',
    clienteNombre: 'Gonzalo',
    clienteApellido: 'Fernández',
    clienteEmail: 'gonzalo.f@gmail.com',
    clienteTelefono: '11-5491-8821',
    clienteDniCuit: '20-38491029-4',
    productos: [
      { id: 'p9', nombre: 'Caja de Herramientas Plástica 22 Pulgadas', cantidad: 2, precioUnitario: 35000, subtotal: 70000 }
    ],
    montoTotal: 70000,
    numeroFactura: 'FC-B-0002-00004506',
    tipoFactura: 'Factura B',
    metodoPago: 'Tarjeta de Débito',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    numeroSeguimiento: '',
    estadoEnvio: 'Entregado',
    notas: '',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-081',
    fecha: formatDateIso(12),
    clienteId: 'CLI-1025',
    clienteNombre: 'Nicolás',
    clienteApellido: 'Sánchez',
    clienteEmail: 'nico_sanchez@gmail.com',
    clienteTelefono: '342-8819201',
    clienteDniCuit: '20-36910293-8',
    productos: [
      { id: 'p10', nombre: 'Hidrolavadora Alta Presión 1600W 130 Bar', cantidad: 1, precioUnitario: 198000, subtotal: 198000 }
    ],
    montoTotal: 198000,
    numeroFactura: 'FC-B-0002-00004505',
    tipoFactura: 'Factura B',
    metodoPago: 'MercadoPago',
    canal: 'WooCommerce',
    metodoEnvio: 'Correo Argentino',
    numeroSeguimiento: 'CA-992019482',
    estadoEnvio: 'Entregado',
    notas: 'Compra concretada en tienda online.',
    creadoEn: new Date().toISOString()
  },
  {
    id: 'V-2026-080',
    fecha: formatDateIso(18),
    clienteId: 'CLI-1008',
    clienteNombre: 'Mariana',
    clienteApellido: 'Rossi',
    clienteEmail: 'marianarossi@hotmail.com',
    clienteTelefono: '342-4591029',
    clienteDniCuit: '27-33104928-1',
    productos: [
      { id: 'p2', nombre: 'Set de Mechas Cobalto x13 unid', cantidad: 3, precioUnitario: 28500, subtotal: 85500 }
    ],
    montoTotal: 85500,
    numeroFactura: 'FC-A-0002-00001039',
    tipoFactura: 'Factura A',
    metodoPago: 'Transferencia',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    numeroSeguimiento: '',
    estadoEnvio: 'Entregado',
    notas: '',
    creadoEn: new Date().toISOString()
  }
];

export const INITIAL_CATALOG: CatalogProduct[] = [
  { id: 'p1', sku: 'TAL-20V-HD', nombre: 'Taladro Percutor Inalámbrico 20V Heavy Duty', precio: 145000, stock: 12, categoria: 'Herramientas Eléctricas', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=150&auto=format&fit=crop&q=80', estadoWoo: 'publish' },
  { id: 'p2', sku: 'SET-MEC-COB', nombre: 'Set de Mechas Cobalto x13 unid', precio: 28500, stock: 45, categoria: 'Accesorios', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80', estadoWoo: 'publish' },
  { id: 'p3', sku: 'ATO-18V-BR', nombre: 'Atornillador de Impacto Brushless 18V', precio: 189000, stock: 8, categoria: 'Herramientas Eléctricas', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=150&auto=format&fit=crop&q=80', estadoWoo: 'publish' },
  { id: 'p4', sku: 'AMO-45-850W', nombre: 'Amoladora Angular 4 1/2" 850W Pro', precio: 82000, stock: 20, categoria: 'Herramientas Eléctricas', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=150&auto=format&fit=crop&q=80', estadoWoo: 'publish' },
  { id: 'p5', sku: 'SEN-14-2200W', nombre: 'Sierra Sensitiva 14" 2200W Profesional', precio: 320000, stock: 4, categoria: 'Maquinaria Heavy', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=150&auto=format&fit=crop&q=80', estadoWoo: 'publish' },
  { id: 'p6', sku: 'DIS-SEN-14X3', nombre: 'Disco de Corte Sensitiva 14" x3', precio: 14500, stock: 100, categoria: 'Abrasivos', origen: 'Manual', estadoWoo: 'publish' },
  { id: 'p7', sku: 'JUE-HER-108P', nombre: 'Juego de Herramientas Manuales 108 pzas', precio: 112000, stock: 0, categoria: 'Herramientas Manuales', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=150&auto=format&fit=crop&q=80', estadoWoo: 'publish' },
  { id: 'p8', sku: 'SOL-INV-180A', nombre: 'Soldadora Inverter 180A con Máscara Fotosensible', precio: 245000, stock: 6, categoria: 'Soldadura', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=150&auto=format&fit=crop&q=80', estadoWoo: 'publish' },
  { id: 'p9', sku: 'CAJ-HER-22PL', nombre: 'Caja de Herramientas Plástica 22 Pulgadas', precio: 35000, stock: 22, categoria: 'Almacenamiento', origen: 'Manual', estadoWoo: 'publish' },
  { id: 'p10', sku: 'HID-1600W-130B', nombre: 'Hidrolavadora Alta Presión 1600W 130 Bar (Oculto en Tienda)', precio: 198000, stock: 10, categoria: 'Limpieza', origen: 'WooCommerce', imagenUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=150&auto=format&fit=crop&q=80', estadoWoo: 'draft' },
];

export const INITIAL_WOO_CONFIG: WooCommerceConfig = {
  url: 'https://mi-tienda-ecommerce.com',
  consumerKey: 'ck_e78923b02941039a82f01a839120',
  consumerSecret: 'cs_1049281a0293184f0293049102a9',
  autoSync: true,
  syncIntervalHours: 1,
  ultimoSync: new Date().toISOString(),
  conectado: true,
};
