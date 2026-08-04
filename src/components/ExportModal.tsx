import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Sale } from '../types';
import { exportSalesToCSV, getMonthYearLabel } from '../utils/formatters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  currentMonthIso: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, sales, currentMonthIso }) => {
  if (!isOpen) return null;

  const [exportRange, setExportRange] = useState<'este_mes' | 'todos'>('este_mes');
  const [exportChannel, setExportChannel] = useState<string>('TODOS');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = () => {
    let salesToExport = [...sales];

    if (exportRange === 'este_mes') {
      salesToExport = salesToExport.filter((s) => s.fecha.startsWith(currentMonthIso));
    }

    if (exportChannel !== 'TODOS') {
      salesToExport = salesToExport.filter((s) => s.canal === exportChannel);
    }

    if (salesToExport.length === 0) {
      setErrorMessage('No hay ventas que coincidan con los criterios seleccionados.');
      return;
    }

    setErrorMessage(null);
    const filename = `ventas_${exportRange}_${exportChannel.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    exportSalesToCSV(salesToExport, filename);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 p-2 rounded-lg border border-blue-200 dark:border-blue-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Exportar Planilla a CSV / Excel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Descarga tus ventas para respaldos o análisis en Excel/Google Sheets
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Rango de fechas a exportar</label>
            <select
              value={exportRange}
              onChange={(e) => setExportRange(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="este_mes">Mes Actual ({getMonthYearLabel(currentMonthIso)})</option>
              <option value="todos">Todo el Historial de Ventas ({sales.length} registros)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Filtrar por Canal</label>
            <select
              value={exportChannel}
              onChange={(e) => setExportChannel(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos los Canales</option>
              <option value="Local">Sólo Local Físico</option>
              <option value="MercadoLibre">Sólo MercadoLibre</option>
              <option value="WooCommerce">Sólo WooCommerce</option>
            </select>
          </div>

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-2.5 rounded-lg text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button onClick={onClose} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md font-medium cursor-pointer transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-md flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Descargar CSV</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
