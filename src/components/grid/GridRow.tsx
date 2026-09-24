import React from 'react';
import {
  Edit3,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Printer,
  AlertCircle,
  CreditCard,
  DollarSign,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  Store,
  ShoppingBag,
  MessageSquare,
  Instagram,
  Phone
} from 'lucide-react';
import { Sale, PaymentMethod, SaleChannel } from '../../types';
import { formatCurrency, formatDate, validateRequiredSaleFields } from '../../utils/formatters';
import { getAndreaniStatusConfig } from '../../utils/andreaniStatusMapper';

export interface GridVisibleColumns {
  fecha: boolean;
  clienteId: boolean;
  clienteNombre: boolean;
  productoNombre: boolean;
  montoTotal: boolean;
  numeroFactura: boolean;
  metodoPago: boolean;
  canal: boolean;
  metodoEnvio: boolean;
  numeroSeguimiento: boolean;
  estadoEnvio: boolean;
  acciones: boolean;
}

export interface GridRowProps {
  sale: Sale;
  isSelected: boolean;
  visibleColumns: GridVisibleColumns;
  editingCell: { id: string; field: string } | null;
  inlineValue: string;
  copiedId: string | null;
  onSelectRow: (id: string) => void;
  onStartInlineEdit: (sale: Sale, field: string) => void;
  onChangeInlineValue: (val: string) => void;
  onSaveInlineEdit: (id: string) => void;
  onCopyText: (text: string, copyKey: string) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onPrintRemito: (sale: Sale) => void;
}

// Helper badge color for sales channel
const getChannelBadge = (canal: SaleChannel) => {
  const canalClean = canal.trim();
  const canalLower = canalClean.toLowerCase();

  let colorClasses =
    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  let icon = <ShoppingBag className="w-3 h-3 text-slate-400" />;

  if (canalLower === 'local') {
    colorClasses =
      'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 font-semibold';
    icon = <Store className="w-3 h-3 text-slate-600 dark:text-slate-400" />;
  } else if (canalLower === 'mercadolibre' || canalLower === 'meli') {
    colorClasses =
      'bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300/80 dark:border-amber-800/80';
    icon = <ShoppingBag className="w-3 h-3 text-amber-700 dark:text-amber-400" />;
  } else if (canalLower === 'woocommerce' || canalLower === 'web' || canalLower === 'tienda') {
    colorClasses =
      'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80';
    icon = <ShoppingBag className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
  } else if (canalLower === 'whatsapp' || canalLower === 'wpp') {
    colorClasses =
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80';
    icon = <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
  } else if (canalLower === 'instagram' || canalLower === 'ig') {
    colorClasses =
      'bg-pink-50 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-200/80 dark:border-pink-800/80';
    icon = <Instagram className="w-3 h-3 text-pink-600 dark:text-pink-400" />;
  } else if (canalLower.includes('telef')) {
    colorClasses =
      'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80';
    icon = <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${colorClasses}`}>
      {icon}
      {canalClean}
    </span>
  );
};

// Helper badge color for payment method
const getPaymentMethodBadge = (metodo: PaymentMethod) => {
  const metodoClean = metodo.trim();
  const metodoLower = metodoClean.toLowerCase();

  let colorClasses =
    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  let icon = <CreditCard className="w-3 h-3 text-slate-400" />;

  if (metodoLower === 'efectivo') {
    colorClasses =
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80';
    icon = <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
  } else if (metodoLower === 'transferencia' || metodoLower === 'banco') {
    colorClasses =
      'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/80';
    icon = <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
  } else if (
    metodoLower === 'tarjeta de débito' ||
    metodoLower === 'debito' ||
    metodoLower === 'débito' ||
    metodoLower === 'tarjeta debito'
  ) {
    colorClasses =
      'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80';
    icon = <CreditCard className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />;
  } else if (
    metodoLower === 'tarjeta de crédito' ||
    metodoLower === 'credito' ||
    metodoLower === 'crédito' ||
    metodoLower === 'tarjeta credito'
  ) {
    colorClasses =
      'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80';
    icon = <CreditCard className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />;
  } else if (metodoLower === 'mercadopago' || metodoLower === 'mp') {
    colorClasses =
      'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/80';
    icon = <ExternalLink className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
  } else if (metodoLower === 'efectivo contra entrega' || metodoLower === 'contra entrega') {
    colorClasses =
      'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/80';
    icon = <DollarSign className="w-3 h-3 text-teal-600 dark:text-teal-400" />;
  } else if (metodoLower.includes('cheque') || metodoLower.includes('echeq')) {
    colorClasses =
      'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80';
    icon = <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${colorClasses}`}>
      {icon}
      {metodoClean}
    </span>
  );
};

// Helper badge for Shipping status / Andreani tracked status
const getAndreaniStatusBadge = (statusText?: string | null) => {
  const config = getAndreaniStatusConfig(statusText);
  let icon = <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />;

  if (config.iconType === 'check') {
    icon = <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
  } else if (config.iconType === 'truck') {
    icon = <Truck className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
  } else if (config.iconType === 'store') {
    icon = <Store className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
  } else if (config.iconType === 'alert') {
    icon = <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-semibold border shadow-2xs ${config.badgeClass}`}
      title={`Estado de envío: ${config.label} - ${config.hint}`}
    >
      {icon}
      <span>{config.label}</span>
    </span>
  );
};

export const GridRow: React.FC<GridRowProps> = React.memo(({
  sale,
  isSelected,
  visibleColumns,
  editingCell,
  inlineValue,
  copiedId,
  onSelectRow,
  onStartInlineEdit,
  onChangeInlineValue,
  onSaveInlineEdit,
  onCopyText,
  onEditSale,
  onDeleteSale,
  onPrintRemito
}) => {
  const firstProduct = sale.productos[0];
  const productCount = sale.productos.length;
  const isAndreani = sale.metodoEnvio?.toLowerCase().includes('andreani');
  const hasTracking = Boolean(sale.numeroSeguimiento && sale.numeroSeguimiento.trim() !== '');
  const valResult = validateRequiredSaleFields(sale);

  return (
    <tr
      className={`divide-x divide-slate-100 dark:divide-slate-800 transition-colors group ${
        !valResult.isValid
          ? 'bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100/60 dark:hover:bg-amber-900/50'
          : isSelected
          ? 'bg-blue-50/70 dark:bg-blue-950/70 hover:bg-blue-100/70 dark:hover:bg-blue-900/70'
          : 'bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
      }`}
    >
      {/* Checkbox */}
      <td className="p-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectRow(sale.id)}
          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
        />
      </td>

      {/* NCLI */}
      {visibleColumns.clienteId && (
        <td className="p-2.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {!valResult.isValid && (
              <span
                className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 p-0.5 rounded cursor-help"
                title={`⚠️ Registro Incompleto. Falta: ${valResult.missingFields.join(', ')}`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </span>
            )}
            <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
              {sale.clienteId || 'SIN-NCLI'}
            </span>
          </div>
        </td>
      )}

      {/* Fecha */}
      {visibleColumns.fecha && (
        <td className="p-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap font-sans">
          {formatDate(sale.fecha)}
        </td>
      )}

      {/* Cliente Nombre */}
      {visibleColumns.clienteNombre && (
        <td className="p-2.5 font-sans font-medium text-slate-900 dark:text-slate-100">
          <div className="truncate max-w-[180px]" title={`${sale.clienteNombre} ${sale.clienteApellido || ''}`}>
            {sale.clienteNombre} {sale.clienteApellido}
          </div>
        </td>
      )}

      {/* Producto */}
      {visibleColumns.productoNombre && (
        <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate max-w-[220px]" title={firstProduct?.nombre}>
              {firstProduct ? firstProduct.nombre : 'Sin productos'}
            </span>
            {productCount > 1 && (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold shrink-0 border border-slate-200 dark:border-slate-700">
                +{productCount - 1} más
              </span>
            )}
          </div>
        </td>
      )}

      {/* Monto Total */}
      {visibleColumns.montoTotal && (
        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          {editingCell?.id === sale.id && editingCell?.field === 'montoTotal' ? (
            <input
              type="number"
              value={inlineValue}
              onChange={(e) => onChangeInlineValue(e.target.value)}
              onBlur={() => onSaveInlineEdit(sale.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveInlineEdit(sale.id)}
              autoFocus
              className="w-24 bg-white dark:bg-slate-800 border border-blue-500 text-right text-emerald-700 dark:text-emerald-400 px-1 py-0.5 rounded focus:outline-none shadow-xs"
            />
          ) : (
            <span
              onClick={() => onStartInlineEdit(sale, 'montoTotal')}
              className="cursor-pointer hover:underline"
              title="Haz clic para editar el monto"
            >
              {formatCurrency(sale.montoTotal)}
            </span>
          )}
        </td>
      )}

      {/* Nº Factura */}
      {visibleColumns.numeroFactura && (
        <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {editingCell?.id === sale.id && editingCell?.field === 'numeroFactura' ? (
            <input
              type="text"
              value={inlineValue}
              onChange={(e) => onChangeInlineValue(e.target.value)}
              onBlur={() => onSaveInlineEdit(sale.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveInlineEdit(sale.id)}
              autoFocus
              className="w-32 bg-white dark:bg-slate-800 border border-blue-500 text-slate-900 dark:text-slate-100 px-1 py-0.5 rounded focus:outline-none text-xs shadow-xs"
            />
          ) : (
            <div className="flex items-center gap-1 group/fac">
              <span
                onClick={() => onStartInlineEdit(sale, 'numeroFactura')}
                className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                title="Haz clic para editar número de factura"
              >
                {sale.numeroFactura || '---'}
              </span>
              {sale.numeroFactura && (
                <button
                  type="button"
                  onClick={() => onCopyText(sale.numeroFactura, `fac-${sale.id}`)}
                  className="opacity-0 group-hover/fac:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-opacity"
                  title="Copiar nº factura"
                >
                  {copiedId === `fac-${sale.id}` ? (
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          )}
        </td>
      )}

      {/* Canal */}
      {visibleColumns.canal && (
        <td className="p-2.5 font-sans whitespace-nowrap">{getChannelBadge(sale.canal)}</td>
      )}

      {/* Método Pago */}
      {visibleColumns.metodoPago && (
        <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {getPaymentMethodBadge(sale.metodoPago)}
        </td>
      )}

      {/* Método Envío */}
      {visibleColumns.metodoEnvio && (
        <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap">
          <span>{sale.metodoEnvio}</span>
        </td>
      )}

      {/* Nº Seguimiento */}
      {visibleColumns.numeroSeguimiento && (
        <td className="p-2.5 font-mono whitespace-nowrap">
          {editingCell?.id === sale.id && editingCell?.field === 'numeroSeguimiento' ? (
            <input
              type="text"
              value={inlineValue}
              onChange={(e) => onChangeInlineValue(e.target.value)}
              onBlur={() => onSaveInlineEdit(sale.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveInlineEdit(sale.id)}
              autoFocus
              className="w-28 bg-white dark:bg-slate-800 border border-blue-500 text-slate-900 dark:text-slate-100 px-1 py-0.5 rounded focus:outline-none text-xs shadow-xs"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/track">
              {isAndreani && hasTracking ? (
                <a
                  href={`https://www.andreani.com/envio/${encodeURIComponent(sale.numeroSeguimiento!.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] bg-red-600 hover:bg-red-700 text-white px-2.5 py-0.5 rounded font-sans font-medium transition-colors shadow-2xs"
                  title={`Abrir www.andreani.com/envio/${sale.numeroSeguimiento} en nueva ventana`}
                >
                  <span>{sale.numeroSeguimiento}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span
                  onClick={() => onStartInlineEdit(sale, 'numeroSeguimiento')}
                  className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                  title="Haz clic para editar nº de seguimiento"
                >
                  {sale.numeroSeguimiento || 'Sin tracking'}
                </span>
              )}

              {sale.numeroSeguimiento && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onStartInlineEdit(sale, 'numeroSeguimiento')}
                    className="opacity-0 group-hover/track:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-opacity"
                    title="Editar tracking"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyText(sale.numeroSeguimiento!, `track-${sale.id}`)}
                    className="opacity-0 group-hover/track:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-opacity"
                    title="Copiar código de seguimiento"
                  >
                    {copiedId === `track-${sale.id}` ? (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </td>
      )}

      {/* Estado Envío */}
      {visibleColumns.estadoEnvio && (
        <td className="p-2.5 font-sans whitespace-nowrap">
          {editingCell?.id === sale.id && editingCell?.field === 'estadoEnvio' ? (
            <select
              value={inlineValue}
              onChange={(e) => {
                onChangeInlineValue(e.target.value);
                onSaveInlineEdit(sale.id);
              }}
              onBlur={() => onSaveInlineEdit(sale.id)}
              autoFocus
              className="bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs p-0.5 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Pendiente de ingreso">Pendiente de ingreso</option>
              <option value="En camino">En camino</option>
              <option value="Listo para retirar">Listo para retirar</option>
              <option value="Entregado">Entregado</option>
              <option value="No entregado">No entregado</option>
              <option value="Enviado">Enviado</option>
              <option value="No Requiere">No Requiere</option>
            </select>
          ) : (
            <div
              onClick={() => onStartInlineEdit(sale, 'estadoEnvio')}
              className="cursor-pointer"
              title="Haz clic para cambiar el estado de envío"
            >
              {getAndreaniStatusBadge(sale.estadoEnvio)}
            </div>
          )}
        </td>
      )}

      {/* Acciones */}
      {visibleColumns.acciones && (
        <td className="p-2 text-center whitespace-nowrap sticky right-0 bg-white/95 dark:bg-slate-900/95 group-hover:bg-blue-50/95 dark:group-hover:bg-slate-800/95 transition-colors">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onPrintRemito(sale)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
              title="Imprimir Remito Oficial"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onEditSale(sale)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
              title="Editar venta completa"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteSale(sale.id)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
              title="Eliminar venta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
});

GridRow.displayName = 'GridRow';
