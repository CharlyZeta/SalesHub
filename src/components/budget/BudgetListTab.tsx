import React from 'react';
import { Plus, Eye, FileText, ArrowRight, Trash2, MessageSquare, Mail } from 'lucide-react';
import { Budget } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export interface BudgetListTabProps {
  budgets: Budget[];
  onNewBudget: () => void;
  onOpenSendModal: (budget: Budget, channel: 'whatsapp' | 'email') => void;
  onPreviewBudget: (budget: Budget) => void;
  onEditBudget: (budget: Budget) => void;
  onConvert: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => void;
}

export const BudgetListTab: React.FC<BudgetListTabProps> = ({
  budgets,
  onNewBudget,
  onOpenSendModal,
  onPreviewBudget,
  onEditBudget,
  onConvert,
  onDeleteBudget
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Presupuestos Generados</h3>
        <button
          type="button"
          onClick={onNewBudget}
          className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Presupuesto</span>
        </button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            <tr>
              <th className="p-3">Nº Presupuesto</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Cond. Venta</th>
              <th className="p-3 text-right">Importe Total</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {budgets.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                  No hay presupuestos registrados aún. Haz clic en "Nuevo Presupuesto".
                </td>
              </tr>
            ) : (
              budgets.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">{b.numeroPresupuesto}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{b.fechaEmision}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{b.razonSocialNombre}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{b.condicionVenta}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(b.importeTotal)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.estado === 'Convertido'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : b.estado === 'Aprobado'
                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {b.estado}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => onOpenSendModal(b, 'whatsapp')}
                      className="bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 p-1.5 rounded cursor-pointer transition-colors"
                      title="Enviar por WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSendModal(b, 'email')}
                      className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 p-1.5 rounded cursor-pointer transition-colors"
                      title="Enviar por Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPreviewBudget(b)}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-1.5 rounded cursor-pointer"
                      title="Ver / Imprimir PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditBudget(b)}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-1.5 rounded cursor-pointer"
                      title="Editar"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    {b.estado !== 'Convertido' && (
                      <button
                        type="button"
                        onClick={() => onConvert(b)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded cursor-pointer transition-colors"
                        title="Convertir a Venta Real"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteBudget(b.id)}
                      className="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 p-1.5 rounded cursor-pointer transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
