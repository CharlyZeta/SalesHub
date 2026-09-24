import React from 'react';

export interface GridPaginationProps {
  recordsPerPage: number;
  setRecordsPerPage: (val: number) => void;
  showAllRows: boolean;
  setShowAllRows: (val: boolean) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
}

export const GridPagination: React.FC<GridPaginationProps> = ({
  recordsPerPage,
  setRecordsPerPage,
  showAllRows,
  setShowAllRows,
  currentPage,
  setCurrentPage,
  totalPages
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 select-none">
      <div className="flex items-center gap-2">
        <span>Registros por página:</span>
        <select
          value={recordsPerPage}
          onChange={(e) => {
            setRecordsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          disabled={showAllRows}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-mono font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {[20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 ml-2 cursor-pointer font-sans text-[11px] text-slate-500 dark:text-slate-400 select-none">
          <input
            type="checkbox"
            checked={showAllRows}
            onChange={(e) => {
              setShowAllRows(e.target.checked);
              setCurrentPage(1);
            }}
            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
          />
          <span>Mostrar todos</span>
        </label>
      </div>

      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span>Página:</span>
        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
        >
          &lt; Anterior
        </button>

        <span className="font-semibold text-slate-900 dark:text-slate-100 px-1">
          {currentPage} / {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
        >
          Siguiente &gt;
        </button>
      </div>
    </div>
  );
};
