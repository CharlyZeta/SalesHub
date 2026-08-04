import React from 'react';
import { 
  PlusCircle, 
  FileSpreadsheet, 
  BarChart3, 
  Users, 
  ShoppingBag, 
  Download, 
  Store,
  Settings,
  FileText,
  Terminal,
  Lock,
  ShieldCheck,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';
import { getMonthYearLabel } from '../utils/formatters';
import { UserRole } from '../types';

interface HeaderProps {
  currentMonthIso: string;
  totalMonthSales: number;
  monthSalesCount: number;
  onOpenNewSale: () => void;
  onOpenImport?: () => void;
  onOpenAnalytics: () => void;
  onOpenCustomers: () => void;
  onOpenWooCommerce: () => void;
  onOpenExport: () => void;
  onOpenBudget: () => void;
  onOpenConfig: () => void;
  onOpenLogs?: () => void;
  onLockApp?: () => void;
  currentRole?: UserRole;
  wooConnected: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonthIso,
  totalMonthSales,
  monthSalesCount,
  onOpenNewSale,
  onOpenImport,
  onOpenAnalytics,
  onOpenCustomers,
  onOpenWooCommerce,
  onOpenExport,
  onOpenBudget,
  onOpenConfig,
  onOpenLogs,
  onLockApp,
  currentRole = 'OPERADOR',
  wooConnected,
  theme = 'light',
  onToggleTheme
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Subdomain Info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-base md:text-lg tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                DUAL S.R.L. <span className="text-slate-400 dark:text-slate-500 font-normal">/ Gestión Comercial</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Planilla Interactiva de Gestión & Control • {getMonthYearLabel(currentMonthIso)}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Main Quick Entry Action */}
          <button
            id="btn-nueva-venta"
            onClick={onOpenNewSale}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium text-xs md:text-sm px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
            title="Registrar una nueva venta en la planilla"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-300" />
            <span>+ Nueva Venta</span>
          </button>

          {/* Budgeting Tool */}
          <button
            id="btn-presupuestos"
            onClick={onOpenBudget}
            className="bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-slate-700 font-medium text-xs md:text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Herramienta de presupuestos para clientes agendados o eventuales"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Presupuestos</span>
          </button>

          {/* Analytics / Stats */}
          <button
            id="btn-estadisticas"
            onClick={onOpenAnalytics}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs md:text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ver reportes y estadísticas de ventas"
          >
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Estadísticas</span>
          </button>

          {/* Customer Directory */}
          <button
            id="btn-clientes"
            onClick={onOpenCustomers}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs md:text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Directorio de Clientes e Historiales"
          >
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden lg:inline">Clientes</span>
          </button>

          {/* Catalog & WooCommerce API */}
          <button
            id="btn-woocommerce"
            onClick={onOpenWooCommerce}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs md:text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors relative cursor-pointer"
            title="Integración WooCommerce / Catálogo de Productos"
          >
            <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden xl:inline">Catálogo / Woo</span>
            <span className="xl:hidden">Woo</span>
            {wooConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="WooCommerce Conectado" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Configuración pendiente" />
            )}
          </button>

          {/* System Logs */}
          {onOpenLogs && (
            <button
              id="btn-logs-sistema"
              onClick={onOpenLogs}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs md:text-sm px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ver Logs y Auditoría del Sistema"
            >
              <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </button>
          )}

          {/* System Settings (Channels & Payment Methods) */}
          <button
            id="btn-configuracion"
            onClick={onOpenConfig}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs md:text-sm px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Configurar Canales de Venta, Métodos de Pago y Seguridad"
          >
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Security & Lock Button */}
          {onLockApp && (
            <button
              id="btn-bloquear-sesion"
              onClick={onLockApp}
              className={`border font-medium text-xs md:text-sm px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentRole === 'ADMIN'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/80'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={`Perfil: ${currentRole}. Clic para bloquear o cambiar perfil`}
            >
              {currentRole === 'ADMIN' ? (
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
              <span className="hidden sm:inline font-bold text-[11px]">
                {currentRole}
              </span>
              <Lock className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>
          )}

          {/* Export */}
          <button
            id="btn-exportar"
            onClick={onOpenExport}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs md:text-sm px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar planilla a CSV / Excel"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Theme Switch Control (Absolute Far Right) */}
          {onToggleTheme && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
              <button
                id="switch-toggle-theme"
                type="button"
                role="switch"
                aria-checked={theme === 'dark'}
                onClick={onToggleTheme}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
                title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                <span className="sr-only">Cambiar Modo Claro/Oscuro</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="h-3 w-3 text-indigo-600" />
                  ) : (
                    <Sun className="h-3 w-3 text-amber-500" />
                  )}
                </span>
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline select-none">
                {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

