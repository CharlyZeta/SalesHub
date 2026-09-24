import React from 'react';
import { FileText } from 'lucide-react';
import { InvoiceType, PaymentMethod, ShippingMethod, ShippingStatus } from '../../types';

export interface SaleBillingSectionProps {
  tipoFactura: InvoiceType;
  setTipoFactura: (v: InvoiceType) => void;
  numeroFactura: string;
  setNumeroFactura: (v: string) => void;
  metodoPago: PaymentMethod;
  setMetodoPago: (v: PaymentMethod) => void;
  metodosPago: string[];
  metodoEnvio: ShippingMethod;
  setMetodoEnvio: (v: ShippingMethod) => void;
  metodosEnvio: string[];
  numeroSeguimiento: string;
  setNumeroSeguimiento: (v: string) => void;
  estadoEnvio: ShippingStatus;
  setEstadoEnvio: (v: ShippingStatus) => void;
  estadosEnvio: string[];
  notas: string;
  setNotas: (v: string) => void;
  generateDefaultInvoiceNumber: (tipo: InvoiceType) => string;
}

export const SaleBillingSection: React.FC<SaleBillingSectionProps> = ({
  tipoFactura,
  setTipoFactura,
  numeroFactura,
  setNumeroFactura,
  metodoPago,
  setMetodoPago,
  metodosPago,
  metodoEnvio,
  setMetodoEnvio,
  metodosEnvio,
  numeroSeguimiento,
  setNumeroSeguimiento,
  estadoEnvio,
  setEstadoEnvio,
  estadosEnvio,
  notas,
  setNotas,
  generateDefaultInvoiceNumber
}) => {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span>Facturación, Cobro y Envíos</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tipo Factura */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Tipo de Comprobante</label>
          <select
            value={tipoFactura}
            onChange={(e) => {
              const val = e.target.value as InvoiceType;
              setTipoFactura(val);
              if (val === 'Sin Factura') {
                setNumeroFactura('');
              } else {
                setNumeroFactura(generateDefaultInvoiceNumber(val));
              }
            }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-xs"
          >
            <option value="Factura B" className="dark:bg-slate-900">
              Factura B (Consumidor Final)
            </option>
            <option value="Factura A" className="dark:bg-slate-900">
              Factura A (Responsable Inscripto)
            </option>
            <option value="Factura C" className="dark:bg-slate-900">
              Factura C (Monotributo)
            </option>
            <option value="Ticket" className="dark:bg-slate-900">
              Ticket de Caja
            </option>
            <option value="Sin Factura" className="dark:bg-slate-900">
              Sin Factura / Remito
            </option>
          </select>
        </div>

        {/* Nº Factura */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº Factura Emitida</label>
          <input
            type="text"
            placeholder={tipoFactura === 'Sin Factura' ? 'Sin comprobante' : 'B-0003-00001234'}
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            disabled={tipoFactura === 'Sin Factura'}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono shadow-xs disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Método de Pago */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Método de Pago *</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            {metodosPago.map((m) => (
              <option key={m} value={m} className="dark:bg-slate-900">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Método de Envío */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Método de Envío</label>
          <select
            value={metodoEnvio}
            onChange={(e) => setMetodoEnvio(e.target.value as ShippingMethod)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-xs"
          >
            {metodosEnvio.map((m) => (
              <option key={m} value={m} className="dark:bg-slate-900">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Nº Seguimiento */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº Seguimiento / Guía</label>
          <input
            type="text"
            placeholder="Ej: 390001294102"
            value={numeroSeguimiento}
            onChange={(e) => setNumeroSeguimiento(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Estado de Envío */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Estado del Envío</label>
          <select
            value={estadoEnvio}
            onChange={(e) => setEstadoEnvio(e.target.value as ShippingStatus)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-xs"
          >
            {estadosEnvio.map((status) => (
              <option key={status} value={status} className="dark:bg-slate-900">
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-slate-500 dark:text-slate-400 mb-1">Observaciones / Notas Internas</label>
        <textarea
          rows={2}
          placeholder="Aclaraciones sobre la venta, cliente o retiro..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
        />
      </div>
    </div>
  );
};
