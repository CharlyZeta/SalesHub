import React from 'react';
import { MessageSquare, Mail, FileDown, Printer, CheckCircle2, Loader2 } from 'lucide-react';
import { Budget, CompanyConfig } from '../../types';
import { numberToWordsSpanish } from '../../utils/numberToWords';

export interface BudgetPrintPreviewProps {
  selectedBudget: Budget;
  empresa?: CompanyConfig;
  isGeneratingPdf: boolean;
  onOpenSendModal: (budget: Budget, channel: 'whatsapp' | 'email') => void;
  onDownloadPdf: () => void;
  onPrint: () => void;
  onConvert: (budget: Budget) => void;
}

export const BudgetPrintPreview: React.FC<BudgetPrintPreviewProps> = ({
  selectedBudget,
  empresa,
  isGeneratingPdf,
  onOpenSendModal,
  onDownloadPdf,
  onPrint,
  onConvert
}) => {
  return (
    <div className="space-y-4">
      {/* Action Toolbar on screen */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200">Presupuesto {selectedBudget.numeroPresupuesto}</span>
          <span className="text-slate-500 dark:text-slate-400">| Cliente: {selectedBudget.razonSocialNombre}</span>
          {selectedBudget.estado === 'Convertido' && (
            <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-800">
              Venta Real Convertida
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSendModal(selectedBudget, 'whatsapp')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSendModal(selectedBudget, 'email')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>

          {/* Direct PDF Download Button */}
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs transition-colors"
            title="Generar y descargar archivo PDF oficial directamente a tu equipo"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={onPrint}
            className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
            title="Vista de impresión directa del navegador"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Imprimir</span>
          </button>

          {/* Convert to Sale Button */}
          {selectedBudget.estado !== 'Convertido' && (
            <button
              type="button"
              onClick={() => onConvert(selectedBudget)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Convertir a Venta Real</span>
            </button>
          )}
        </div>
      </div>

      {/* PDF Sheet Layout - Matching official voucher standard */}
      <div id="budget-pdf-content" className="bg-white text-black p-6 sm:p-8 border border-slate-300 max-w-[800px] mx-auto shadow-md font-sans print:shadow-none print:border-none print:p-0 print:m-0">
        
        {/* Header Outer Container */}
        <div className="border border-black relative mb-2">
          <div className="grid grid-cols-12 text-xs">
            
            {/* Left Column: Firm Details */}
            <div className="col-span-6 p-3 border-r border-black relative">
              {empresa.mostrarLogo && empresa.logoUrl ? (
                <div className="mb-2 border-b border-slate-300 pb-2">
                  <img src={empresa.logoUrl} alt={empresa.nombre} className="max-h-12 object-contain mb-1.5" />
                  {empresa.subtitulo && (
                    <div className="text-[9px] font-bold tracking-widest text-slate-700 uppercase leading-tight">
                      {empresa.subtitulo}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-2 border-b border-slate-300 pb-2">
                  <div className="font-bold text-base mb-1">{empresa.nombre}</div>
                  {empresa.subtitulo && (
                    <div className="text-[9px] font-bold text-slate-700 uppercase">{empresa.subtitulo}</div>
                  )}
                </div>
              )}

              <div className="text-[10px] space-y-0.5">
                <p><span className="font-semibold">Domicilio :</span> {empresa.domicilio}</p>
                <p><span className="font-semibold">Tel./Email:</span> {empresa.telefono} / {empresa.email}</p>
                <p className="mt-1 font-bold">{empresa.condicionIva}</p>
              </div>
            </div>

            {/* Center Box: AFIP Document Type "X" */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-white border-b border-x border-black w-10 h-10 flex items-center justify-center font-bold text-xl z-10">
              X
            </div>

            {/* Right Column: Presupuesto & AFIP data */}
            <div className="col-span-6 p-3 pl-6 text-[10px] space-y-1">
              <div className="text-base font-bold text-right mb-2">Presupuesto</div>
              
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span>Punto de Venta: <strong className="font-mono">{selectedBudget.puntoVenta || '0001'}</strong></span>
                <span>Comp. Nº: <strong className="font-mono">{selectedBudget.comprobanteNumero}</strong></span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="font-semibold">Fecha de Emisión :</span>
                <span className="font-mono font-bold">{selectedBudget.fechaEmision.split('-').reverse().join('/')}</span>
              </div>

              <div className="pt-2 text-[10px] space-y-0.5">
                <p><span className="font-semibold">CUIT:</span> {empresa.cuit}</p>
                <p><span className="font-semibold">Ing. Brutos:</span> {empresa.iibb}</p>
                <p><span className="font-semibold">Fecha de Inicio de Actividades:</span> {empresa.inicioActividades || '01/07/2008'}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Client Information Section */}
        <div className="border border-black p-3 mb-2 text-[11px] leading-relaxed grid grid-cols-12 gap-2">
          <div className="col-span-12 sm:col-span-7 space-y-0.5">
            <p><span className="font-bold">Razón Social:</span> {selectedBudget.razonSocialNombre} {selectedBudget.apellido}</p>
            <p><span className="font-bold">Domicilio:</span> {selectedBudget.domicilio || '.- , .'} {selectedBudget.codigoPostal ? `(CP ${selectedBudget.codigoPostal})` : ''}</p>
            <p><span className="font-bold">Condición Fiscal:</span> {selectedBudget.condicionFiscal}</p>
            <p><span className="font-bold">Condición de Venta:</span> {selectedBudget.condicionVenta}</p>
          </div>
          <div className="col-span-12 sm:col-span-5 text-right space-y-0.5">
            <p><span className="font-bold">CUIT / DNI:</span> {selectedBudget.dniCuit || '1'}</p>
            {selectedBudget.telefono && <p><span className="font-bold">Teléfono:</span> {selectedBudget.telefono}</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-black mb-2 overflow-hidden min-h-[220px]">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-black font-bold text-[10px]">
                <th className="p-1.5 border-r border-black w-14 text-center">Cant.</th>
                <th className="p-1.5 border-r border-black">Descripción</th>
                <th className="p-1.5 border-r border-black text-right w-24">P. Unit.</th>
                <th className="p-1.5 border-r border-black text-center w-16">% Desc.</th>
                <th className="p-1.5 text-right w-24">SubTotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
              {selectedBudget.items.map((item, i) => (
                <tr key={i}>
                  <td className="p-1.5 border-r border-black text-center">{Number(item.cantidad || 0).toFixed(2)}</td>
                  <td className="p-1.5 border-r border-black font-sans">{item.descripcion}</td>
                  <td className="p-1.5 border-r border-black text-right">{Number(item.precioUnitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td className="p-1.5 border-r border-black text-center">{Number(item.descuentoPorcentaje || 0).toFixed(2)}</td>
                  <td className="p-1.5 text-right font-bold">{Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Footer Section */}
        <div className="border border-black p-3 grid grid-cols-12 gap-2 text-[10px]">
          {/* Left Notes & Amount in Words */}
          <div className="col-span-7 flex flex-col justify-between pr-2">
            <div>
              <p className="font-bold uppercase mb-0.5">Son Pesos:</p>
              <p className="font-serif italic text-[11px] leading-tight">
                {numberToWordsSpanish(selectedBudget.importeTotal)}
              </p>
            </div>

            {selectedBudget.observaciones && (
              <div className="mt-2 text-[9px] text-slate-700">
                <strong>Obs:</strong> {selectedBudget.observaciones}
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-300 text-[9px] flex justify-between">
              <span>Ord. Compra: ____________</span>
              <span>CAE Nº: ____________</span>
            </div>
          </div>

          {/* Right Column Totals */}
          <div className="col-span-5 border-l border-black pl-3 space-y-1 font-mono text-right">
            <div className="flex justify-between">
              <span>Sub Total:</span>
              <span>{Number(selectedBudget.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Descuento:</span>
              <span>{Number(selectedBudget.descuentoTotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between">
              <span>Percepciones:</span>
              <span>{Number(selectedBudget.percepciones || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between font-bold text-xs border-t border-black pt-1.5 mt-1 bg-slate-100 p-1">
              <span>IMPORTE TOTAL:</span>
              <span>{Number(selectedBudget.importeTotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
