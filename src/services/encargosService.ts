import { EncargoItem, EncargoEstado, EncargoTipo, CatalogProduct } from '../types';
import { addSystemLog } from '../utils/logger';

const ENCARGOS_STORAGE_KEY = 'app_encargos_v1';

export interface ItemCompraConsolidado {
  key: string;
  tipo: EncargoTipo;
  productoNombre: string;
  productoDescripcion?: string;
  cantidadTotal: number;
  encargosIds: string[];
  clientes: { nombre: string; telefono?: string; cantidad: number }[];
  proveedorSugerido?: string;
}

export interface EncargosMetrics {
  total: number;
  pendientes: number;
  pedidos: number;
  recibidos: number;
  entregados: number;
  cancelados: number;
}

/**
 * Lee todos los encargos almacenados en localStorage.
 */
export function getEncargos(): EncargoItem[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(ENCARGOS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error al leer encargos de localStorage:', err);
    addSystemLog('ERROR', 'Encargos', `Fallo al leer encargos: ${err instanceof Error ? err.message : String(err)}`);
  }
  return [];
}

/**
 * Persiste la lista completa de encargos en localStorage.
 */
export function saveEncargos(items: EncargoItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ENCARGOS_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (err) {
    console.error('Error al guardar encargos en localStorage:', err);
    addSystemLog('ERROR', 'Encargos', `Fallo al guardar encargos: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Genera un ID legible y secuencial para el encargo.
 */
export function generateEncargoId(existentes: EncargoItem[] = []): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `ENC-${yearMonth}-`;

  const numbers = existentes
    .filter((e) => e.id.startsWith(prefix))
    .map((e) => parseInt(e.id.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));

  const nextSeq = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Crea un nuevo encargo y lo persiste.
 */
export function addEncargo(
  data: Omit<EncargoItem, 'id' | 'fechaRegistro' | 'estado'> & Partial<Pick<EncargoItem, 'id' | 'estado'>>
): EncargoItem {
  const existentes = getEncargos();
  const id = data.id || generateEncargoId(existentes);
  const nuevoEncargo: EncargoItem = {
    ...data,
    id,
    estado: data.estado || 'pendiente_compra',
    fechaRegistro: new Date().toISOString(),
  };

  const actualizados = [nuevoEncargo, ...existentes];
  saveEncargos(actualizados);
  addSystemLog(
    'INFO',
    'Encargos',
    `Nuevo encargo registrado: ${nuevoEncargo.id} (${nuevoEncargo.productoNombre}) para ${nuevoEncargo.clienteNombre}`
  );
  return nuevoEncargo;
}

/**
 * Actualiza parcialmente un encargo existente.
 */
export function updateEncargo(id: string, updates: Partial<EncargoItem>): EncargoItem | null {
  const existentes = getEncargos();
  const idx = existentes.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const anterior = existentes[idx];
  const actualizado: EncargoItem = {
    ...anterior,
    ...updates,
  };

  // Si cambia a entregado o recibido y no tenía fecha de completado
  if (updates.estado === 'entregado' && !actualizado.fechaCompletado) {
    actualizado.fechaCompletado = new Date().toISOString();
  }

  existentes[idx] = actualizado;
  saveEncargos(existentes);

  if (updates.estado && updates.estado !== anterior.estado) {
    addSystemLog('INFO', 'Encargos', `Encargo ${id} cambió de estado: ${anterior.estado} → ${updates.estado}`);
  }

  return actualizado;
}

/**
 * Elimina un encargo por ID.
 */
export function deleteEncargo(id: string): boolean {
  const existentes = getEncargos();
  const filtrados = existentes.filter((e) => e.id !== id);
  if (filtrados.length === existentes.length) return false;

  saveEncargos(filtrados);
  addSystemLog('WARN', 'Encargos', `Encargo eliminado: ${id}`);
  return true;
}

/**
 * Calcula las métricas generales de encargos para el dashboard y badges.
 */
export function getEncargosMetrics(items: EncargoItem[] = getEncargos()): EncargosMetrics {
  return items.reduce<EncargosMetrics>(
    (acc, curr) => {
      acc.total += 1;
      if (curr.estado === 'pendiente_compra') acc.pendientes += 1;
      else if (curr.estado === 'pedido_proveedor') acc.pedidos += 1;
      else if (curr.estado === 'recibido') acc.recibidos += 1;
      else if (curr.estado === 'entregado') acc.entregados += 1;
      else if (curr.estado === 'cancelado') acc.cancelados += 1;
      return acc;
    },
    { total: 0, pendientes: 0, pedidos: 0, recibidos: 0, entregados: 0, cancelados: 0 }
  );
}

/**
 * Agrupa los encargos pendientes de compra sumando las cantidades por producto/repuesto.
 * Ideal para generar la lista de compras que se enviará al distribuidor/proveedor.
 */
export function agruparParaCompras(
  encargos: EncargoItem[],
  filtroEstado: EncargoEstado = 'pendiente_compra'
): ItemCompraConsolidado[] {
  const filtrados = encargos.filter((e) => e.estado === filtroEstado);
  const mapa = new Map<string, ItemCompraConsolidado>();

  for (const item of filtrados) {
    const key = `${item.tipo}::${item.productoNombre.trim().toLowerCase()}`;
    const existente = mapa.get(key);

    const infoCliente = {
      nombre: item.clienteNombre,
      telefono: item.clienteTelefono,
      cantidad: item.cantidad,
    };

    if (existente) {
      existente.cantidadTotal += item.cantidad;
      existente.encargosIds.push(item.id);
      existente.clientes.push(infoCliente);
      if (!existente.productoDescripcion && item.productoDescripcion) {
        existente.productoDescripcion = item.productoDescripcion;
      }
      if (!existente.proveedorSugerido && item.proveedorSugerido) {
        existente.proveedorSugerido = item.proveedorSugerido;
      }
    } else {
      mapa.set(key, {
        key,
        tipo: item.tipo,
        productoNombre: item.productoNombre.trim(),
        productoDescripcion: item.productoDescripcion?.trim(),
        cantidadTotal: item.cantidad,
        encargosIds: [item.id],
        clientes: [infoCliente],
        proveedorSugerido: item.proveedorSugerido?.trim(),
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) => a.productoNombre.localeCompare(b.productoNombre));
}

/**
 * Genera el texto formateado de la lista de compras para enviar al proveedor por WhatsApp o copiar al portapapeles.
 */
export function generarMensajeWhatsAppProveedor(
  items: ItemCompraConsolidado[],
  empresaNombre: string = 'Mi Empresa'
): string {
  if (items.length === 0) return '';

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const lineas: string[] = [
    `📦 *LISTA DE COMPRA / PEDIDO DE MERCADERÍA*`,
    `🏢 *Solicita:* ${empresaNombre}`,
    `📅 *Fecha:* ${fechaHoy}`,
    `───────────────────────`,
    '',
  ];

  const repuestos = items.filter((i) => i.tipo === 'repuesto');
  const productos = items.filter((i) => i.tipo === 'producto');

  if (repuestos.length > 0) {
    lineas.push(`🔧 *REPUESTOS SOLICITADOS:*`);
    repuestos.forEach((r, idx) => {
      const desc = r.productoDescripcion ? ` (${r.productoDescripcion})` : '';
      lineas.push(`${idx + 1}. *[x${r.cantidadTotal}]* ${r.productoNombre}${desc}`);
    });
    lineas.push('');
  }

  if (productos.length > 0) {
    lineas.push(`🏷️ *PRODUCTOS / ACCESORIOS:*`);
    productos.forEach((p, idx) => {
      const desc = p.productoDescripcion ? ` (${p.productoDescripcion})` : '';
      lineas.push(`${idx + 1}. *[x${p.cantidadTotal}]* ${p.productoNombre}${desc}`);
    });
    lineas.push('');
  }

  lineas.push(`───────────────────────`);
  lineas.push(`Total de ítems a cotizar/pedir: *${items.reduce((acc, i) => acc + i.cantidadTotal, 0)} unidades*`);
  lineas.push(`_Agradecemos confirmación de disponibilidad y fecha estimada de entrega._`);

  return lineas.join('\n');
}

/**
 * Genera el mensaje de aviso para el cliente notificándole que su encargo ya arribó a la tienda.
 */
export function generarMensajeWhatsAppCliente(encargo: EncargoItem, empresaNombre: string = 'Mi Empresa'): string {
  const nombreCliente = encargo.clienteNombre.split(' ')[0] || encargo.clienteNombre;
  const saldoPendiente =
    encargo.precioEstimado && encargo.seña
      ? Math.max(0, encargo.precioEstimado * encargo.cantidad - encargo.seña)
      : undefined;

  let msg = `Hola *${nombreCliente}*, te escribimos de *${empresaNombre}* para avisarte que ya recibimos tu encargo de: *${encargo.productoNombre}* (x${encargo.cantidad}).`;

  if (saldoPendiente !== undefined && saldoPendiente > 0) {
    msg += ` Podés pasar a retirarlo cuando gustes. Saldo restante: *$${saldoPendiente.toLocaleString('es-AR')}*.`;
  } else {
    msg += ` ¡Ya podés pasar a retirarlo por el local cuando gustes!`;
  }

  msg += `\n\nCualquier consulta estamos a disposición. ¡Muchas gracias!`;
  return msg;
}

/**
 * Genera la URL de enlace directo de WhatsApp (wa.me) para enviar el aviso al cliente.
 */
export function generarUrlWhatsApp(telefono: string | undefined, mensaje: string): string {
  if (!telefono) return '';
  // Limpiar caracteres no numéricos
  let cleanPhone = telefono.replace(/\D/g, '');
  // Si empieza con 0 o no tiene código de país, normalizar para Argentina (549...)
  if (cleanPhone.startsWith('15')) {
    cleanPhone = '549' + cleanPhone.substring(2);
  } else if (!cleanPhone.startsWith('54')) {
    cleanPhone = '549' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Incorpora un encargo al catálogo de productos si aún no existe.
 */
export function crearProductoDeEncargo(
  encargo: EncargoItem,
  catalogoActual: CatalogProduct[]
): { producto: CatalogProduct; yaExiste: boolean } {
  const nombreTrim = encargo.productoNombre.trim();
  const existente = catalogoActual.find((p) => p.nombre.toLowerCase().trim() === nombreTrim.toLowerCase());

  if (existente) {
    return { producto: existente, yaExiste: true };
  }

  const nuevoId = String(Math.floor(10000 + Math.random() * 90000));
  const nuevoProducto: CatalogProduct = {
    id: nuevoId,
    nombre: nombreTrim,
    categoria: encargo.tipo === 'repuesto' ? 'Repuestos' : 'General',
    precio: encargo.precioEstimado || 0,
    stock: encargo.cantidad,
    sku: `ENC-${nuevoId}`,
    origen: 'Manual',
  };

  addSystemLog('INFO', 'Catálogo', `Producto incorporado desde encargo ${encargo.id}: ${nuevoProducto.nombre}`);
  return { producto: nuevoProducto, yaExiste: false };
}
