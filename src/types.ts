export type SaleChannel = string;

export type PaymentMethod = string;

export type ShippingMethod = 
  | 'Retiro en Local' 
  | 'Correo Argentino' 
  | 'Andreani' 
  | 'OCA' 
  | 'Cadetería / Moto' 
  | 'Mercado Envíos' 
  | 'Otro'
  | string;

export type ShippingStatus = 'Pendiente' | 'Enviado' | 'Entregado' | 'No Requiere';

export type InvoiceType = 'Factura A' | 'Factura B' | 'Factura C' | 'Ticket' | 'Sin Factura';

export interface SaleProductItem {
  id: string;
  nombre: string;
  sku?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  imagenUrl?: string;
  descuento?: number; // Porcentaje de descuento (0 a 100)
}

export interface Sale {
  id: string;
  fecha: string; // ISO String YYYY-MM-DD
  clienteId: string; // e.g. "CLI-1002"
  clienteNombre: string;
  clienteApellido?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  clienteDniCuit?: string;
  clienteDireccion?: string;
  clienteLocalidad?: string;
  clienteProvincia?: string;
  
  productos: SaleProductItem[];
  montoTotal: number;
  
  numeroFactura: string; // e.g. "FC-A-0001-00001234"
  tipoFactura?: InvoiceType;
  metodoPago: PaymentMethod;
  canal: SaleChannel;
  metodoEnvio: ShippingMethod;
  numeroSeguimiento?: string;
  estadoEnvio: ShippingStatus;
  
  envioDomicilioDiferente?: boolean;
  entregaDireccion?: string;
  entregaLocalidad?: string;
  entregaProvincia?: string;
  entregaCoordenadas?: {
    lat: number;
    lng: number;
  };

  notas?: string;
  creadoEn: string;
  andreaniStatus?: string;
  andreaniLastCheck?: string;
}

export interface Customer {
  id?: string;
  clienteId: string;
  nombre: string;
  apellido: string;
  razonSocialNombre?: string;
  email?: string;
  telefono?: string;
  dniCuit?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  canalHabitual?: string;
  origen?: 'Manual' | 'WooCommerce';
  totalCompras?: number;
  cantidadPedidos?: number;
  ultimaCompra?: string;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria?: string;
  origen: 'Manual' | 'WooCommerce';
  imagenUrl?: string;
  estadoWoo?: string;
}

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  autoSync: boolean;
  syncIntervalHours?: number; // Automatic sync frequency in hours (e.g. 1, 2, 4, 6, 12, 24)
  ultimoSync?: string;
  conectado: boolean;
}

export interface ColumnMapping {
  fecha: string;
  clienteId: string;
  clienteNombre: string;
  clienteApellido: string;
  productoNombre: string;
  montoTotal: string;
  numeroFactura: string;
  metodoPago: string;
  canal: string;
  metodoEnvio: string;
  numeroSeguimiento: string;
}

export interface DateFilterRange {
  startDate: string;
  endDate: string;
  preset: 'este_mes' | 'mes_anterior' | 'ultimos_30' | 'este_ano' | 'todos' | 'personalizado';
}

export interface BudgetItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number;
  subtotal: number;
  imagenUrl?: string;
}

export interface Budget {
  id: string;
  numeroPresupuesto: string; // e.g. "P0001-00000311"
  puntoVenta: string; // "0001"
  comprobanteNumero: string; // "00000311"
  fechaEmision: string; // ISO date YYYY-MM-DD
  
  // Customer info
  esClienteAgendado: boolean;
  clienteId?: string;
  razonSocialNombre: string; // Nombre y Apellido o Razón Social
  apellido?: string;
  dniCuit: string;
  domicilio: string;
  telefono: string;
  email?: string;
  codigoPostal: string;
  condicionFiscal: string; // e.g. "CONSUMIDOR FINAL", "RESPONSABLE INSCRIPTO", "MONOTRIBUTO"
  condicionVenta: string; // e.g. "CONTADO", "TRANSFERENCIA", "30 DÍAS"
  
  items: BudgetItem[];
  
  subtotal: number;
  descuentoTotal: number;
  percepciones: number;
  importeTotal: number;
  
  observaciones?: string;
  estado: 'Pendiente' | 'Aprobado' | 'Convertido' | 'Rechazado';
  ventaConvertidaId?: string;
  creadoEn: string;
}

export type UserRole = 'ADMIN' | 'OPERADOR';

export interface SecurityConfig {
  seguridadHabilitada: boolean;
  pinAcceso: string; // PIN or Password (default "1234")
  tiempoInactividadMinutos: number; // Inactivity auto-lock minutes (e.g. 15, 0 = disabled)
  modoProduccionVPS: boolean;
  bloquearSincronizacionWooCommerce: boolean; // Only Admin
  bloquearBorradoLogs: boolean; // Only Admin
  rolActual?: UserRole;
}

export interface BackupConfig {
  autoBackup: boolean;
  periodicity: 'startup' | 'daily' | 'weekly' | 'ops_20' | 'ops_50';
  lastBackupDate?: string;
  lastBackupFilename?: string;
}

export interface CompanyConfig {
  nombre: string;
  subtitulo?: string;
  logoUrl?: string;
  mostrarLogo?: boolean;
  domicilio: string;
  telefono: string;
  email: string;
  cuit: string;
  iibb: string;
  condicionIva: string;
  inicioActividades?: string;
  puntoVentaVenta?: string;
  puntoVentaPresupuesto?: string;
}

export interface AppConfig {
  canales: string[];
  metodosPago: string[];
  metodosEnvio?: string[];
  estadosEnvio?: string[];
  ultimoNumeroPresupuesto: number; // e.g. 311 for P0001-00000311
  puntoVentaPresupuesto: string; // e.g. "0001"
  empresa?: CompanyConfig;
  seguridad?: SecurityConfig;
  backup?: BackupConfig;
  andreaniHash?: string;
}

