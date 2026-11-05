import React, { useEffect, useMemo, useState } from 'react';
import { X, Printer, FileDown, AlertCircle } from 'lucide-react';
import { CompanyConfig, Sale } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { armarReciboPago } from '../../utils/paymentReceipt';
import { exportarReciboPagoPDF } from '../../utils/pdfReciboPago';
import { addSystemLog } from '../../utils/logger';
import { defaultStorageRepository } from '../../services/storageRepository';

export interface ReciboPagoModalProps {
  sale: Sale;
  /** Si se indica, el recibo corresponde a ese pago; sin él, a la venta. */
  pagoId?: string;
  empresa?: Partial<CompanyConfig>;
  onClose: () => void;
}

/**
 * Recibo de pago (FEAT-PAY-004): comprobante de la venta o de un pago parcial.
 * Se deriva del libro de pagos; no persiste nada (BR-001).
 */
export const ReciboPagoModal: React.FC<ReciboPagoModalProps> = ({ sale, pagoId, empresa, onClose }) => {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  // Si el llamador no pasa la empresa, se lee la configuración guardada una vez.
  const [empresaLocal, setEmpresaLocal] = useState<Partial<CompanyConfig> | undefined>(empresa);

  useEffect(() => {
    if (empresa) return;
    let activo = true;
    defaultStorageRepository
      .getConfig()
      .then((cfg) => {
        if (activo) setEmpresaLocal(cfg?.empresa);
      })
      .catch(() => {
        /* sin configuración: el recibo usa los valores por defecto */
      });
    return () => {
      activo = false;
    };
  }, [empresa]);

  const datosEmpresa = empresa ?? empresaLocal;
  const recibo = useMemo(() => armarReciboPago(sale, pagoId), [sale, pagoId]);

  const handleImprimir = () => {
    setError('');
    const contenido = document.getElementById('recibo-pdf-content');
    if (!contenido) {
      setError('No se encontró el contenido del recibo.');
      return;
    }

    const area = document.createElement('div');
    area.id = 'print-area-recibo';
    area.appendChild(contenido.cloneNode(true));
    document.body.appendChild(area);
    document.body.classList.add('printing-recibo');

    const limpiar = () => {
      document.body.classList.remove('printing-recibo');
      window.removeEventListener('afterprint', limpiar);
      const nodo = document.getElementById('print-area-recibo');
      if (nodo) nodo.remove();
    };

    window.addEventListener('afterprint', limpiar);
    try {
      window.print();
      addSystemLog('INFO', 'Pagos', `Recibo ${recibo.numero} enviado a impresión`);
    } catch (e: any) {
      setError(e?.message || 'No se pudo abrir el diálogo de impresión');
      addSystemLog('ERROR', 'Pagos', `Error al imprimir recibo ${recibo.numero}: ${e?.message || e}`);
    } finally {
      setTimeout(limpiar, 500);
    }
  };

  const handlePdf = async () => {
    setError('');
    setGenerando(true);
    try {
      await exportarReciboPagoPDF(recibo.numero);
    } catch (e: any) {
      setError(e?.message || 'No se pudo generar el PDF');
    } finally {
      setGenerando(false);
    }
  };

  const empresaNombre = datosEmpresa?.nombre || 'Mi Empresa';
  const fiscal = [
    datosEmpresa?.cuit ? `CUIT: ${datosEmpresa.cuit}` : '',
    datosEmpresa?.domicilio || '',
    datosEmpresa?.telefono || '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Barra de acciones (no se imprime) */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Recibo {recibo.numero}
            <span className="ml-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {recibo.tipo === 'pago' ? 'pago parcial' : 'de la venta'}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Cerrar recibo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hoja del recibo: esto es lo que se imprime y se exporta */}
        <div className="p-4 overflow-y-auto">
          <div id="recibo-pdf-content" className="bg-white text-slate-900 p-6 border border-slate-200 rounded-lg">
            <div className="flex items-start justify-between border-b border-slate-300 pb-3">
              <div>
                <div className="text-lg font-bold">{empresaNombre}</div>
                {datosEmpresa?.subtitulo ? (
                  <div className="text-[11px] text-slate-600">{datosEmpresa.subtitulo}</div>
                ) : null}
                {fiscal ? <div className="text-[11px] text-slate-600 mt-0.5">{fiscal}</div> : null}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold uppercase tracking-wide">Recibo de pago</div>
                <div className="text-[11px] font-mono">{recibo.numero}</div>
                <div className="text-[11px] text-slate-600">Emisión: {formatDate(recibo.fechaEmision)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-[11px]">
              <div>
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Cliente</div>
                <div className="font-semibold">{recibo.cliente.nombre}</div>
                <div>Documento: {recibo.cliente.documento}</div>
                <div>Teléfono: {recibo.cliente.telefono}</div>
                <div>{recibo.cliente.direccion}</div>
                <div>{recibo.cliente.localidadProvincia}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">Comprobante</div>
                <div className="font-mono">{recibo.comprobante}</div>
                <div className="text-slate-600">Venta: {recibo.ventaId}</div>
                <div className="mt-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Condición: </span>
                  <span className="font-semibold">{recibo.condicion.label}</span>
                </div>
              </div>
            </div>

            <table className="w-full mt-4 text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-1 pr-2 font-bold">Cant.</th>
                  <th className="py-1 pr-2 font-bold">Detalle</th>
                  <th className="py-1 pr-2 font-bold text-right">P. unitario</th>
                  <th className="py-1 font-bold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {recibo.productos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 text-slate-500 italic">
                      Sin detalle de productos.
                    </td>
                  </tr>
                ) : (
                  recibo.productos.map((p, i) => (
                    <tr key={`${p.nombre}-${i}`} className="border-b border-slate-100">
                      <td className="py-1 pr-2 font-mono">{p.cantidad}</td>
                      <td className="py-1 pr-2">{p.nombre}</td>
                      <td className="py-1 pr-2 text-right font-mono">{formatCurrency(p.precioUnitario)}</td>
                      <td className="py-1 text-right font-mono">{formatCurrency(p.subtotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {recibo.parcialidad && (
              <div className="mt-3 border border-slate-300 rounded p-2 text-[11px]">
                <span className="font-bold">
                  Pago {recibo.parcialidad.indice} de {recibo.parcialidad.totalPagos}
                </span>
                <span className="mx-2">·</span>
                <span className="font-mono font-bold">{formatCurrency(recibo.parcialidad.importe)}</span>
                <span className="mx-2">·</span>
                <span>{recibo.parcialidad.medio}</span>
                <span className="mx-2">·</span>
                <span>{formatDate(recibo.parcialidad.fecha)}</span>
                {recibo.parcialidad.nota ? (
                  <div className="text-slate-600 mt-0.5">Nota: {recibo.parcialidad.nota}</div>
                ) : null}
              </div>
            )}

            {recibo.ventaHistorica && (
              <div className="mt-3 text-[10px] text-slate-600 italic">
                Venta registrada antes del módulo de pagos: se considera cobrada por el total.
              </div>
            )}

            <div className="mt-4 ml-auto w-64 text-[11px]">
              <div className="flex justify-between py-0.5">
                <span>Total de la venta</span>
                <span className="font-mono">{formatCurrency(recibo.total)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Pagado acumulado</span>
                <span className="font-mono">{formatCurrency(recibo.pagado)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-t border-slate-300 mt-1 pt-1 font-bold">
                <span>Saldo pendiente</span>
                <span className="font-mono">{formatCurrency(recibo.saldo)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-end text-[10px] text-slate-600">
              <div>
                <div className="border-t border-slate-400 w-40 pt-1">Firma / aclaración</div>
              </div>
              <div>Recibo {recibo.numero}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 pb-2 flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        )}

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={handleImprimir}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium text-xs px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          <button
            type="button"
            onClick={handlePdf}
            disabled={generando}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{generando ? 'Generando…' : 'Descargar PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReciboPagoModal;
