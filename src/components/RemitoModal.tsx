import React, { useState } from 'react';
import { X, Printer, Truck, CheckCircle2, Copy, ExternalLink, Package, ShieldCheck, MapPin, User, FileText, FileDown, Loader2 } from 'lucide-react';
import { Sale, Customer, AppConfig } from '../types';
import { formatDate } from '../utils/formatters';
import { addSystemLog } from '../utils/logger';

interface RemitoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  customers?: Customer[];
  config?: AppConfig;
}

export const RemitoModal: React.FC<RemitoModalProps> = ({
  isOpen,
  onClose,
  sale,
  customers = [],
  config
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const empresa = config?.empresa || {
    nombre: 'DUAL S.R.L.',
    subtitulo: 'Para Comercio y Hogar',
    logoUrl: '',
    mostrarLogo: false,
    domicilio: 'ESTANISLAO ZEBALLOS 3825, SANTA FE.',
    telefono: '0342-4883135',
    email: 'dualdesantafe@hotmail.com',
    cuit: '30710642857',
    iibb: '0111353853',
    condicionIva: 'I.V.A. Responsable Inscripto',
  };

  // Find customer in directory to get shipping address if available
  const matchedCustomer = customers.find(c => c.clienteId === sale.clienteId);

  // Resolver domicilio de entrega: prioridad al domicilio alternativo si se especificó, sino domicilio del cliente
  let direccionEntrega = '';
  if (sale.envioDomicilioDiferente && sale.entregaDireccion?.trim()) {
    const parts = [sale.entregaDireccion, sale.entregaLocalidad, sale.entregaProvincia].filter(Boolean);
    direccionEntrega = parts.join(', ');
  } else if (sale.clienteDireccion?.trim()) {
    const parts = [sale.clienteDireccion, sale.clienteLocalidad, sale.clienteProvincia].filter(Boolean);
    direccionEntrega = parts.join(', ');
  } else if (matchedCustomer) {
    const parts = [
      matchedCustomer.direccion,
      matchedCustomer.localidad,
      matchedCustomer.provincia
    ].filter(Boolean);
    direccionEntrega = parts.join(', ') || 'Domicilio no especificado';
  } else {
    direccionEntrega = 'Domicilio no especificado';
  }

  const isAndreani = sale.metodoEnvio?.toLowerCase().includes('andreani');
  const hasTracking = Boolean(sale.numeroSeguimiento && sale.numeroSeguimiento.trim() !== '');

  const handlePrint = () => {
    const element = document.getElementById('remito-pdf-content');
    if (!element) {
      setErrorMsg('No se encontró el contenido del remito para imprimir.');
      return;
    }
    let printArea = document.getElementById('print-area-remito');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'print-area-remito';
      document.body.appendChild(printArea);
    }
    printArea.innerHTML = '';
    printArea.appendChild(element.cloneNode(true));

    const cleanup = () => {
      document.body.classList.remove('printing-remito');
      window.removeEventListener('afterprint', cleanup);
      const area = document.getElementById('print-area-remito');
      if (area) area.remove();
    };
    document.body.classList.add('printing-remito');
    window.addEventListener('afterprint', cleanup);
    try {
      window.print();
      addSystemLog('INFO', 'Remitos', `Remito #${sale.id} enviado a impresión de comprobante`);
    } catch (err: any) {
      console.error('Error al abrir el diálogo de impresión:', err);
      addSystemLog('ERROR', 'Remitos', `Error al imprimir remito #${sale.id}: ${err?.message || err}`);
    } finally {
      setTimeout(cleanup, 500);
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('remito-pdf-content');
    if (!element) {
      setErrorMsg('No se encontró el contenido del remito para generar el PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const filename = `Remito_${sale.id}.pdf`;

      // Mismo mecanismo que el presupuesto para evitar problemas de viewport/márgenes
      let printArea = document.getElementById('print-area-remito');
      if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'print-area-remito';
        document.body.appendChild(printArea);
      }
      printArea.innerHTML = '';
      printArea.appendChild(element.cloneNode(true));

      let dataUrl = '';
      try {
        dataUrl = await toPng(printArea, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          width: 794
        });
      } finally {
        printArea.innerHTML = '';
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      setErrorMsg(null);
      addSystemLog('INFO', 'Remitos', `Remito #${sale.id} exportado a PDF (${filename})`);
    } catch (err: any) {
      console.error('Error al generar PDF del remito:', err);
      setErrorMsg('No se pudo generar el PDF automáticamente. Usá el botón "Imprimir" y en el diálogo elegí "Guardar como PDF".');
      addSystemLog('ERROR', 'Remitos', `Fallo al generar PDF del remito #${sale.id}: ${err?.message || err}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyTracking = () => {
    if (sale.numeroSeguimiento) {
      navigator.clipboard.writeText(sale.numeroSeguimiento);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white print:block">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header Bar - Hidden on print */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Remito de Entrega / Despacho
                <span className="text-[10px] bg-slate-800 text-red-400 px-2 py-0.5 rounded font-mono border border-slate-700">
                  Venta #{sale.id}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Imprime o descarga el remito oficial para control de despacho y conformidad del cliente o transporte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs border border-slate-700"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible">
          
          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-2 print:hidden">
              <span className="text-xs text-red-800">{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Andreani Tracking Highlight Banner (Screen only if Andreani) */}
          {isAndreani && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded">
                  ANDREANI
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900">Envío Gestionado por Andreani</span>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <span>Nº Seguimiento:</span>
                    <strong className="font-mono text-red-700">{sale.numeroSeguimiento || 'Pendiente de asignación'}</strong>
                  </div>
                </div>
              </div>

              {hasTracking && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTracking}
                    className="bg-white hover:bg-red-100/60 text-slate-700 border border-red-200 px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-red-600" />
                    <span>Copiar Tracking</span>
                  </button>
                  <a
                    href={`https://www.andreani.com/envio/${encodeURIComponent(sale.numeroSeguimiento!.trim())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>Ver en Andreani</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Printable Remito Sheet */}
          <div id="remito-pdf-content" className="bg-white text-black p-6 sm:p-8 border border-slate-300 max-w-[800px] mx-auto font-sans print:border-none print:p-0 print:m-0 print:shadow-none shadow-md">
            
            {/* 1. Header Box */}
            <div className="border-2 border-black relative mb-3">
              <div className="grid grid-cols-12 text-xs">
                
                {/* Left Column: Firm Details */}
                <div className="col-span-6 p-3 border-r-2 border-black relative">
                  {empresa.mostrarLogo && empresa.logoUrl ? (
                    <div className="mb-1.5 border-b border-slate-300 pb-1.5">
                      <img src={empresa.logoUrl} alt={empresa.nombre} className="max-h-12 object-contain" />
                      {empresa.subtitulo && (
                        <div className="text-[9px] font-bold tracking-widest text-slate-700 uppercase leading-tight mt-0.5">
                          {empresa.subtitulo}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-black text-xl mb-1.5 tracking-wide text-slate-900 border-b border-slate-300 pb-1.5">
                        {empresa.nombre}
                      </div>
                      {empresa.subtitulo && (
                        <div className="text-[9px] font-bold tracking-widest text-slate-700 uppercase leading-tight -mt-1 mb-1">
                          {empresa.subtitulo}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] space-y-0.5 leading-snug">
                    <p><span className="font-semibold">Domicilio Comercial:</span> {empresa.domicilio}</p>
                    <p><span className="font-semibold">Teléfono / Email:</span> {empresa.telefono} / {empresa.email}</p>
                    <p className="font-bold text-slate-800 pt-0.5">{empresa.condicionIva}</p>
                  </div>
                </div>

                {/* Center Box: "R" (Remito) */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-white border-b-2 border-x-2 border-black w-10 h-10 flex flex-col items-center justify-center font-bold z-10">
                  <span className="text-xl leading-none">R</span>
                  <span className="text-[7px] uppercase tracking-widest leading-none text-slate-600">Remito</span>
                </div>

                {/* Right Column: Remito Nº & Logistics */}
                <div className="col-span-6 p-3 pl-6 text-[10px] space-y-1">
                  <div className="text-base font-black text-right uppercase tracking-wider mb-1">
                    REMITO DE ENTREGA
                  </div>

                  <div className="flex justify-between border-b border-slate-300 pb-1">
                    <span>Nº Remito Secuencial:</span>
                    <strong className="font-mono text-xs">R0001-{(sale.id.replace(/\D/g, '') || '00000001').padStart(8, '0')}</strong>
                  </div>

                  <div className="flex justify-between pt-0.5">
                    <span className="font-semibold">Fecha de Despacho:</span>
                    <strong className="font-mono">{formatDate(sale.fecha)}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-semibold">Comprobante / Factura:</span>
                    <strong className="font-mono">{sale.numeroFactura || '---'}</strong>
                  </div>

                  <div className="pt-1 text-[9px] space-y-0.5 text-slate-700">
                    <p><span className="font-semibold">CUIT Empresa:</span> {empresa.cuit}</p>
                    <p><span className="font-semibold">Ingresos Brutos:</span> {empresa.iibb}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. Customer & Shipping Destination Box */}
            <div className="border border-black p-3 mb-3 text-[11px] leading-relaxed grid grid-cols-12 gap-3 bg-slate-50/50">
              
              {/* Customer Column */}
              <div className="col-span-12 sm:col-span-7 space-y-1">
                <div className="font-bold border-b border-slate-300 pb-0.5 uppercase text-[10px] text-slate-700 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Datos del Destinatario / Cliente
                </div>
                <p><span className="font-bold">Nombre / Razón Social:</span> {sale.clienteNombre} {sale.clienteApellido || ''}</p>
                <p><span className="font-bold">CUIT / DNI:</span> {sale.clienteDniCuit || 'No informado'}</p>
                <p><span className="font-bold">Teléfono de Contacto:</span> {sale.clienteTelefono || 'No informado'}</p>
                <p><span className="font-bold">Domicilio de Entrega:</span> {direccionEntrega}</p>
              </div>

              {/* Transport / Shipping Column */}
              <div className="col-span-12 sm:col-span-5 border-l border-slate-300 pl-3 space-y-1">
                <div className="font-bold border-b border-slate-300 pb-0.5 uppercase text-[10px] text-slate-700 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Empresa de Transporte y Envío
                </div>
                <p><span className="font-bold">Método / Transporte:</span> <span className="uppercase font-semibold">{sale.metodoEnvio || 'No especificado'}</span></p>
                {sale.metodoEnvio?.toLowerCase() !== 'retiro en local' && (
                  <p><span className="font-bold">Nº de Seguimiento:</span> <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 py-0.5 border border-slate-300 rounded">{sale.numeroSeguimiento || '---'}</span></p>
                )}

                {/* Andreani / Tracking Special Box */}
                {isAndreani && hasTracking && (
                  <div className="mt-2 bg-red-50 border border-red-300 p-1.5 rounded text-[10px] space-y-0.5">
                    <p className="font-black text-red-800 uppercase flex items-center gap-1">
                      <Package className="w-3 h-3 text-red-600" />
                      Transporte: ANDREANI LOGÍSTICA
                    </p>
                    <p className="font-bold">
                      Guía Andreani: <span className="font-mono text-red-700 bg-white px-1 py-0.5 border border-red-200 rounded">{sale.numeroSeguimiento}</span>
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* 3. Dispatched Products Table */}
            <div className="border border-black mb-3 overflow-hidden min-h-[180px]">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-black font-bold text-[10px] uppercase">
                    <th className="p-1.5 border-r border-black w-14 text-center">Cant.</th>
                    <th className="p-1.5 border-r border-black w-28">Código / SKU</th>
                    <th className="p-1.5 border-r border-black">Descripción de los Productos Bultos / Detalle</th>
                    <th className="p-1.5 text-center w-24">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-sans text-[11px]">
                  {sale.productos && sale.productos.length > 0 ? (
                    sale.productos.map((prod, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-black text-center font-mono font-bold text-xs">{prod.cantidad}</td>
                        <td className="p-2 border-r border-black font-mono text-[10px]">{prod.sku || `PRD-${idx + 1}`}</td>
                        <td className="p-2 border-r border-black font-medium">{prod.nombre}</td>
                        <td className="p-2 text-center text-[10px] font-semibold text-slate-700">OK - Completo</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">Sin productos detallados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Notes if any */}
            {sale.notas && (
              <div className="border border-black p-2 mb-3 text-[10px] bg-slate-50">
                <strong>Observaciones / Indicaciones Especiales:</strong> {sale.notas}
              </div>
            )}

            {/* 4. Conforme / Signature Box (REQ: APARTADO PARA QUE FIRME CONFORME EL CLIENTE O TRANSPORTE) */}
            <div className="border-2 border-black p-3 bg-slate-50/30 space-y-3">
              <div className="text-center font-bold text-xs border-b border-black pb-1 uppercase tracking-wide flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                CONFORMIDAD DE RECEPCIÓN Y ENTREGA DE MERCADERÍA
              </div>
              <p className="text-[9.5px] italic text-slate-700 text-center leading-tight">
                Declaro haber recibido de conformidad la totalidad de la mercadería especificada en este remito, en perfecto estado, cantidad y funcionamiento.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-[10px]">
                
                {/* Left: Firma Transportista */}
                <div className="border-t border-black pt-1 text-center space-y-1">
                  <p className="font-bold">FIRMA DEL TRANSPORTISTA / ENTREGADO</p>
                  <p className="text-slate-500">Aclaración: ___________________________</p>
                  <p className="text-slate-500">DNI / Chapa: ________________________</p>
                  <p className="text-slate-500">Fecha: _____ / _____ / _________</p>
                </div>

                {/* Right: Firma Cliente Receptor */}
                <div className="border-t border-black pt-1 text-center space-y-1">
                  <p className="font-bold">FIRMA DEL CLIENTE / RECEPTOR CONFORME</p>
                  <p className="text-slate-500">Aclaración: ___________________________</p>
                  <p className="text-slate-500">DNI / Documento: ________________________</p>
                  <p className="text-slate-500">Fecha de Recepción: _____ / _____ / _________</p>
                </div>

              </div>
            </div>

            {/* Footer Copyright / Leyenda */}
            <div className="mt-3 text-[8px] text-slate-500 text-center flex justify-between items-center border-t border-slate-200 pt-1">
              <span>{empresa.nombre} - Sistema de Gestión de Ventas & Despachos</span>
              <span>Documento de Control Interno y Remisión de Mercadería</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
