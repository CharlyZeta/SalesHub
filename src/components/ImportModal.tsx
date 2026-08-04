import React, { useState } from 'react';
import Papa from 'papaparse';
import { X, FileSpreadsheet, Upload, Clipboard, CheckCircle2, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';
import { Sale, SaleChannel, PaymentMethod, ShippingMethod, ShippingStatus } from '../types';
import { parseDateToISO, parseAmountString } from '../utils/formatters';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSales: (importedSales: Sale[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportSales }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [parsedRawData, setParsedRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1); // 1: Input & Mapping, 2: Preview
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Column Mapping State
  const [mapping, setMapping] = useState({
    fecha: '',
    clienteId: '',
    clienteNombre: '',
    clienteApellido: '',
    productoNombre: '',
    montoTotal: '',
    numeroFactura: '',
    metodoPago: '',
    canal: '',
    metodoEnvio: '',
    numeroSeguimiento: ''
  });

  // Auto-detect matching headers
  const autoMapHeaders = (detectedHeaders: string[]) => {
    const newMap = { ...mapping };
    detectedHeaders.forEach((h) => {
      const lower = h.toLowerCase().trim();
      if (lower.includes('fech')) newMap.fecha = h;
      else if (lower.includes('cli') && (lower.includes('nº') || lower.includes('id') || lower.includes('num'))) newMap.clienteId = h;
      else if (lower.includes('client') || lower.includes('nombre')) newMap.clienteNombre = h;
      else if (lower.includes('apell')) newMap.clienteApellido = h;
      else if (lower.includes('produc') || lower.includes('item') || lower.includes('detalle')) newMap.productoNombre = h;
      else if (lower.includes('mont') || lower.includes('total') || lower.includes('precio') || lower.includes('importe')) newMap.montoTotal = h;
      else if (lower.includes('fact') || lower.includes('comprobante')) newMap.numeroFactura = h;
      else if (lower.includes('pago') || lower.includes('medio')) newMap.metodoPago = h;
      else if (lower.includes('canal') || lower.includes('origen')) newMap.canal = h;
      else if (lower.includes('envio') || lower.includes('transporte')) newMap.metodoEnvio = h;
      else if (lower.includes('track') || lower.includes('seguimiento') || lower.includes('guia')) newMap.numeroSeguimiento = h;
    });
    setMapping(newMap);
  };

  // Handle Parse Raw Text / CSV / TSV
  const handleParseText = () => {
    if (!pastedText.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, pega las filas copiadas de tu planilla de Google Sheets.' });
      return;
    }

    Papa.parse(pastedText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const detectedHeaders = results.meta.fields || Object.keys(results.data[0]);
          setHeaders(detectedHeaders);
          setParsedRawData(results.data);
          autoMapHeaders(detectedHeaders);
          setFeedback(null);
          setStep(2);
        } else {
          setFeedback({ type: 'error', message: 'No se pudieron detectar filas válidas en el texto pegado.' });
        }
      },
      error: (err) => {
        setFeedback({ type: 'error', message: `Error al procesar el texto: ${err.message}` });
      }
    });
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const detectedHeaders = results.meta.fields || Object.keys(results.data[0]);
          setHeaders(detectedHeaders);
          setParsedRawData(results.data);
          autoMapHeaders(detectedHeaders);
          setFeedback(null);
          setStep(2);
        } else {
          setFeedback({ type: 'error', message: 'El archivo CSV seleccionado está vacío o no tiene formato válido.' });
        }
      }
    });
  };

  // Convert raw mapped data into Sale objects
  const processMappedSales = (): Sale[] => {
    return parsedRawData.map((row, idx) => {
      const rawFecha = mapping.fecha ? row[mapping.fecha] : '';
      const rawMonto = mapping.montoTotal ? row[mapping.montoTotal] : '0';
      const rawClienteNombre = mapping.clienteNombre ? row[mapping.clienteNombre] : `Cliente ${idx + 1}`;
      const rawProducto = mapping.productoNombre ? row[mapping.productoNombre] : 'Producto Importado';
      const rawCanal = mapping.canal ? row[mapping.canal] : 'Local';
      const rawPago = mapping.metodoPago ? row[mapping.metodoPago] : 'Efectivo';
      const rawEnvio = mapping.metodoEnvio ? row[mapping.metodoEnvio] : 'Retiro en Local';

      // Clean amount string ($ 1.250,00 or 1250.00 or 1.250.000 -> number)
      const cleanedMonto = parseAmountString(rawMonto);

      // Infer Channel
      let canalFinal: SaleChannel = 'Local';
      const lowerCanal = String(rawCanal).toLowerCase();
      if (lowerCanal.includes('mercadolibre') || lowerCanal.includes('meli')) canalFinal = 'MercadoLibre';
      else if (lowerCanal.includes('woo') || lowerCanal.includes('web') || lowerCanal.includes('tienda')) canalFinal = 'WooCommerce';

      // Infer Payment
      let pagoFinal: PaymentMethod = 'Efectivo';
      const lowerPago = String(rawPago).toLowerCase();
      if (lowerPago.includes('mp') || lowerPago.includes('mercadopago')) pagoFinal = 'MercadoPago';
      else if (lowerPago.includes('transf') || lowerPago.includes('cbu')) pagoFinal = 'Transferencia';
      else if (lowerPago.includes('debito')) pagoFinal = 'Tarjeta de Débito';
      else if (lowerPago.includes('credito') || lowerPago.includes('tarjeta')) pagoFinal = 'Tarjeta de Crédito';

      // Infer Shipping
      let envioFinal: ShippingMethod = 'Retiro en Local';
      const lowerEnvio = String(rawEnvio).toLowerCase();
      if (lowerEnvio.includes('andreani')) envioFinal = 'Andreani';
      else if (lowerEnvio.includes('correo')) envioFinal = 'Correo Argentino';
      else if (lowerEnvio.includes('mercado')) envioFinal = 'Mercado Envíos';
      else if (lowerEnvio.includes('oca')) envioFinal = 'OCA';
      else if (lowerEnvio.includes('cadet') || lowerEnvio.includes('moto')) envioFinal = 'Cadetería / Moto';

      const tracking = mapping.numeroSeguimiento ? row[mapping.numeroSeguimiento] : '';

      return {
        id: `IMP-${Date.now()}-${idx}`,
        fecha: parseDateToISO(rawFecha),
        clienteId: mapping.clienteId && row[mapping.clienteId] ? row[mapping.clienteId] : `CLI-IMP-${1000 + idx}`,
        clienteNombre: rawClienteNombre,
        clienteApellido: mapping.clienteApellido ? row[mapping.clienteApellido] : '',
        productos: [
          {
            id: `p-imp-${idx}`,
            nombre: String(rawProducto),
            cantidad: 1,
            precioUnitario: cleanedMonto,
            subtotal: cleanedMonto
          }
        ],
        montoTotal: cleanedMonto,
        numeroFactura: mapping.numeroFactura ? row[mapping.numeroFactura] : `FC-B-0001-${10000 + idx}`,
        metodoPago: pagoFinal,
        canal: canalFinal,
        metodoEnvio: envioFinal,
        numeroSeguimiento: String(tracking || ''),
        estadoEnvio: tracking ? 'Enviado' : 'Entregado',
        notas: 'Importado de planilla de cálculo',
        creadoEn: new Date().toISOString()
      };
    });
  };

  const handleFinalImport = () => {
    const finalSales = processMappedSales();
    if (finalSales.length === 0) {
      setFeedback({ type: 'error', message: 'No hay ventas para importar.' });
      return;
    }

    onImportSales(finalSales);
    setFeedback({ type: 'success', message: `¡Éxito! Se importaron ${finalSales.length} ventas correctamente a la planilla.` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Importador de Planilla de Google Sheets / CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Migra tu historial de ventas fácilmente copiando celdas o subiendo un archivo
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200">
          
          {feedback && (
            <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            }`}>
              {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              
              {/* Tab options */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Clipboard className="w-4 h-4" />
                  <span>Pegar Celdas de Google Sheets</span>
                </button>
                <button
                  onClick={() => setActiveTab('file')}
                  className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'file'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Archivo CSV</span>
                </button>
              </div>

              {/* Paste Mode */}
              {activeTab === 'paste' && (
                <div className="space-y-2">
                  <p className="text-slate-600 dark:text-slate-400">
                    Abre tu planilla de Google Sheets, selecciona el rango de filas incluyendo la fila de encabezados, presiona <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded text-emerald-800 dark:text-emerald-400 font-mono font-bold">Ctrl + C</kbd> y pégalas aquí:
                  </p>
                  <textarea
                    rows={8}
                    placeholder="Pega aquí las filas copiadas (ej. Fecha, Cliente, Producto, Monto, Factura...)"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-600"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleParseText}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Procesar Celdas</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload Mode */}
              {activeTab === 'file' && (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl p-8 text-center transition-colors">
                  <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Selecciona tu archivo .CSV exportado de Google Sheets</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 mb-4">Formato separado por comas o tabulaciones</p>
                  <input
                    type="file"
                    accept=".csv, .txt"
                    onChange={handleFileUpload}
                    className="block mx-auto text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>
              )}

            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg text-emerald-900 dark:text-emerald-200">
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Se detectaron {parsedRawData.length} filas y {headers.length} columnas en tu planilla.
                </span>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Volver a pegar
                </button>
              </div>

              {/* Column Mapping Section */}
              <div className="bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Mapeo de Columnas (Vincula las columnas de tu planilla)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  
                  {/* Fecha */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Fecha de la venta *</label>
                    <select
                      value={mapping.fecha}
                      onChange={(e) => setMapping({ ...mapping, fecha: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nombre Cliente */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Nombre / Apellido del Cliente *</label>
                    <select
                      value={mapping.clienteNombre}
                      onChange={(e) => setMapping({ ...mapping, clienteNombre: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* ID Cliente */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº Cliente Interno (Opcional)</label>
                    <select
                      value={mapping.clienteId}
                      onChange={(e) => setMapping({ ...mapping, clienteId: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Generar Automático --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Producto */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Producto Vendido *</label>
                    <select
                      value={mapping.productoNombre}
                      onChange={(e) => setMapping({ ...mapping, productoNombre: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Monto Total */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Monto / Total ($) *</label>
                    <select
                      value={mapping.montoTotal}
                      onChange={(e) => setMapping({ ...mapping, montoTotal: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Factura */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº de Factura Emitida</label>
                    <select
                      value={mapping.numeroFactura}
                      onChange={(e) => setMapping({ ...mapping, numeroFactura: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Canal */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Canal (Local vs MercadoLibre)</label>
                    <select
                      value={mapping.canal}
                      onChange={(e) => setMapping({ ...mapping, canal: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Default Local --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Método Pago */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Método de Pago</label>
                    <select
                      value={mapping.metodoPago}
                      onChange={(e) => setMapping({ ...mapping, metodoPago: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Default Efectivo --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tracking */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº de Seguimiento / Guía</label>
                    <select
                      value={mapping.numeroSeguimiento}
                      onChange={(e) => setMapping({ ...mapping, numeroSeguimiento: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {/* Data Preview Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-950 font-semibold text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
                  Vista Previa de Primeras 5 Ventas A Importar:
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px] font-mono">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Cliente</th>
                        <th className="p-2">Producto</th>
                        <th className="p-2 text-right">Monto</th>
                        <th className="p-2">Factura</th>
                        <th className="p-2">Canal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRawData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 text-slate-600 dark:text-slate-400">{parseDateToISO(row[mapping.fecha] || '')}</td>
                          <td className="p-2 text-slate-900 dark:text-slate-100 font-sans">{row[mapping.clienteNombre] || '---'}</td>
                          <td className="p-2 text-slate-700 dark:text-slate-300 font-sans truncate max-w-[150px]">{row[mapping.productoNombre] || '---'}</td>
                          <td className="p-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{row[mapping.montoTotal] || '$ 0'}</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">{row[mapping.numeroFactura] || '---'}</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400 font-sans">{row[mapping.canal] || 'Local'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-md flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Importación de {parsedRawData.length} Ventas</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
