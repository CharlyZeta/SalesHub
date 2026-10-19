import {
  FileSpreadsheet,
  FileText,
  Users,
  ShoppingBag,
  PackageSearch,
  BarChart3,
  Settings,
  ShieldCheck,
  Database,
  Terminal,
} from 'lucide-react';
import type React from 'react';
import { PermissionLevel, ResourcePermissionMap } from '../types';

export interface ToolDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'operativa' | 'gestion' | 'sistema';
  icon: React.ComponentType<{ className?: string }>;
  permiteSoloLectura: boolean; // Si false, solo permite 'none' o 'full'
  defaultOperador: PermissionLevel;
}

/**
 * REGISTRO CENTRAL DE HERRAMIENTAS (Tool Registry).
 * Para añadir un nuevo módulo al control de permisos del sistema, basta con
 * agregar su definición en este arreglo.
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'ventas',
    nombre: 'Planilla de Ventas',
    descripcion: 'Registro interactivo de ventas, cobros y entregas diarias',
    categoria: 'operativa',
    icon: FileSpreadsheet,
    permiteSoloLectura: true,
    defaultOperador: 'full',
  },
  {
    id: 'presupuestos',
    nombre: 'Presupuestos AFIP',
    descripcion: 'Emisión, conversión y seguimiento de presupuestos comerciales',
    categoria: 'operativa',
    icon: FileText,
    permiteSoloLectura: true,
    defaultOperador: 'full',
  },
  {
    id: 'clientes',
    nombre: 'Directorio de Clientes',
    descripcion: 'Fichas de contacto, historial de compras y direcciones de entrega',
    categoria: 'gestion',
    icon: Users,
    permiteSoloLectura: true,
    defaultOperador: 'full',
  },
  {
    id: 'catalogo',
    nombre: 'Catálogo & WooCommerce',
    descripcion: 'Lista de precios, stock de productos y sincronización e-commerce',
    categoria: 'gestion',
    icon: ShoppingBag,
    permiteSoloLectura: true,
    defaultOperador: 'read',
  },
  {
    id: 'encargos',
    nombre: 'Encargos & Compras',
    descripcion: 'Demanda de repuestos/productos no en stock y compras a proveedores',
    categoria: 'gestion',
    icon: PackageSearch,
    permiteSoloLectura: true,
    defaultOperador: 'full',
  },
  {
    id: 'estadisticas',
    nombre: 'Estadísticas & Reportes',
    descripcion: 'Gráficos de ventas, KPIs mensuales y análisis de canales/métodos',
    categoria: 'gestion',
    icon: BarChart3,
    permiteSoloLectura: true,
    defaultOperador: 'read',
  },
  {
    id: 'configuracion',
    nombre: 'Configuración General',
    descripcion: 'Canales de venta, métodos de pago, datos de empresa y Google Maps',
    categoria: 'sistema',
    icon: Settings,
    permiteSoloLectura: false,
    defaultOperador: 'none',
  },
  {
    id: 'seguridad',
    nombre: 'Seguridad & Permisos',
    descripcion: 'Cuentas de usuario, política de acceso y matriz de permisos',
    categoria: 'sistema',
    icon: ShieldCheck,
    permiteSoloLectura: false,
    defaultOperador: 'none',
  },
  {
    id: 'backups',
    nombre: 'Copias de Seguridad',
    descripcion: 'Creación, descarga y restauración de backups de la base de datos',
    categoria: 'sistema',
    icon: Database,
    permiteSoloLectura: false,
    defaultOperador: 'none',
  },
  {
    id: 'logs',
    nombre: 'Logs de Auditoría',
    descripcion: 'Registro cronológico de eventos del sistema, accesos y errores',
    categoria: 'sistema',
    icon: Terminal,
    permiteSoloLectura: true,
    defaultOperador: 'none',
  },
];

/**
 * Genera el mapa de permisos predeterminado para el rol OPERADOR basado en el registro.
 */
export function getDefaultOperadorPermissions(): ResourcePermissionMap {
  const map: ResourcePermissionMap = {};
  for (const tool of TOOL_REGISTRY) {
    map[tool.id] = tool.defaultOperador;
  }
  return map;
}

/**
 * Genera el mapa de permisos total para el rol ADMIN (siempre full en todo).
 */
export function getDefaultAdminPermissions(): ResourcePermissionMap {
  const map: ResourcePermissionMap = {};
  for (const tool of TOOL_REGISTRY) {
    map[tool.id] = 'full';
  }
  return map;
}
