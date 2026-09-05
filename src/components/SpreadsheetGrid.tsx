import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Plus, 
  Columns, 
  Download, 
  X,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  ShoppingBag,
  Store,
  CreditCard,
  Building2,
  DollarSign,
  Printer,
  MessageSquare,
  Instagram,
  Phone,
  FileText
} from 'lucide-react';
import { Sale, SaleChannel, PaymentMethod, ShippingMethod, ShippingStatus } from '../types';
import { formatCurrency, formatDate, validateRequiredSaleFields } from '../utils/formatters';
import { getAndreaniStatusConfig, mapAndreaniTrackingStatus, isTerminalStatus } from '../utils/andreaniStatusMapper';

interface SpreadsheetGridProps {
  sales: Sale[];
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (saleId: string) => void;
  onQuickAddSale: () => void;
  onUpdateInlineSale: (saleId: string, updatedFields: Partial<Sale>) => void;
  onPrintRemito: (sale: Sale) => void;
  selectedChannelFilter: string;
  onChannelFilterChange: (channel: string) => void;
  canales?: string[];
  metodosPago?: string[];
  estadosEnvio?: string[];
  selectedMonth: string;
  showAllMonths: boolean;
  andreaniHash?: string;
  onSyncAndreaniTrackings?: (trackingNumbers: string[], force?: boolean) => Promise<void>;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sales,
  onEditSale,
  onDeleteSale,
  onQuickAddSale,
  onUpdateInlineSale,
  onPrintRemito,
  selectedChannelFilter,
  onChannelFilterChange,
  canales = ['Local', 'MercadoLibre', 'WooCommerce', 'WhatsApp', 'Instagram', 'Venta Telefónica', 'Otro'],
  metodosPago = ['Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'MercadoPago', 'Efectivo contra entrega', 'Cheque / eCheq', 'Otro'],
  estadosEnvio = ['Pendiente', 'Pendiente de ingreso', 'En camino', 'Listo para retirar', 'Entregado', 'No entregado', 'Enviado', 'No Requiere'],
  selectedMonth,
  showAllMonths,
  andreaniHash = '',
  onSyncAndreaniTrackings
}) => {
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('TODOS');
  const [shippingStatusFilter, setShippingStatusFilter] = useState<string>('TODOS');
  const [sortField, setSortField] = useState<keyof Sale>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    fecha: true,
    clienteId: true,
    clienteNombre: true,
    productoNombre: true,
    montoTotal: true,
    numeroFactura: true,
    metodoPago: true,
    canal: true,
    metodoEnvio: true,
    numeroSeguimiento: true,
    estadoEnvio: true,
    acciones: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Andreani Sync Handling
  const [isSyncingAndreani, setIsSyncingAndreani] = useState(false);

  const handleSyncAndreaniClick = async () => {
    if (!andreaniHash) {
      alert('Para utilizar el rastreo automático de Andreani, ingresa el Hash de tu cuenta en Ajustes (ícono ⚙).');
      return;
    }

    const trackingNumbers = paginatedSales
      .filter(s => s.metodoEnvio?.toLowerCase().includes('andreani') && s.numeroSeguimiento && s.numeroSeguimiento.trim() !== '' && !isTerminalStatus(s.estadoEnvio))
      .map(s => s.numeroSeguimiento!.trim());

    if (trackingNumbers.length === 0) {
      alert('No hay envíos de Andreani pendientes de entrega en la página actual o que no estén marcados como Entregado.');
      return;
    }

    setIsSyncingAndreani(true);
    try {
      if (onSyncAndreaniTrackings) {
        await onSyncAndreaniTrackings(trackingNumbers, true);
      }
    } catch (e: any) {
      alert(`Error al sincronizar tracking: ${e.message}`);
    } finally {
      setIsSyncingAndreani(false);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [showAllRows, setShowAllRows] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedChannelFilter, paymentFilter, shippingStatusFilter, searchTerm, selectedMonth, showAllMonths, showAllRows]);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Sale } | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');

  // Handle Sort
  const handleSort = (field: keyof Sale) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filtered & Sorted Sales
  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        // Month filter
        if (!showAllMonths && !s.fecha.startsWith(selectedMonth)) {
          return false;
        }
        // Channel filter
        if (selectedChannelFilter !== 'TODOS' && s.canal !== selectedChannelFilter) {
          return false;
        }
        // Payment filter
        if (paymentFilter !== 'TODOS' && s.metodoPago !== paymentFilter) {
          return false;
        }
        // Shipping Status filter
        if (shippingStatusFilter !== 'TODOS' && s.estadoEnvio !== shippingStatusFilter) {
          return false;
        }
        // Text Search (Customer name, ID, invoice, product, tracking)
        if (searchTerm.trim() !== '') {
          const query = searchTerm.toLowerCase();
          const pNames = s.productos.map((p) => p.nombre.toLowerCase()).join(' ');
          const fullCustomer = `${s.clienteNombre} ${s.clienteApellido || ''} ${s.clienteId}`.toLowerCase();
          const matchInvoice = (s.numeroFactura || '').toLowerCase().includes(query);
          const matchTracking = (s.numeroSeguimiento || '').toLowerCase().includes(query);
          const matchNotes = (s.notas || '').toLowerCase().includes(query);

          return (
            fullCustomer.includes(query) ||
            pNames.includes(query) ||
            matchInvoice ||
            matchTracking ||
            matchNotes
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' 
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [sales, selectedChannelFilter, paymentFilter, shippingStatusFilter, searchTerm, sortField, sortDirection, selectedMonth, showAllMonths]);

  const totalPages = showAllRows ? 1 : Math.ceil(filteredSales.length / recordsPerPage);

  const paginatedSales = useMemo(() => {
    if (showAllRows) {
      return filteredSales;
    }
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredSales.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredSales, currentPage, recordsPerPage, showAllRows]);

  // Keep track of checked tracking numbers in this session to avoid duplicate auto requests
  const autoCheckedRefs = useRef<Set<string>>(new Set());

  // Automatic localized background sync for visible non-terminal Andreani shipments (60s TTL cache)
  useEffect(() => {
    if (!andreaniHash || !onSyncAndreaniTrackings) return;

    const pendingVisible = paginatedSales
      .filter(s => {
        const isAndreani = s.metodoEnvio?.toLowerCase().includes('andreani');
        const hasTracking = s.numeroSeguimiento && s.numeroSeguimiento.trim() !== '';
        const isNotTerminal = !isTerminalStatus(s.estadoEnvio);
        return isAndreani && hasTracking && isNotTerminal;
      })
      .map(s => s.numeroSeguimiento!.trim());

    if (pendingVisible.length > 0) {
      const timer = setTimeout(() => {
        onSyncAndreaniTrackings(pendingVisible, false).catch(err => {
          console.error("Auto visible tracking sync failed:", err);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [paginatedSales, andreaniHash, onSyncAndreaniTrackings]);

  // Handle Copy text to clipboard
  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Select all handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSales.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Save Inline Edit
  const startInlineEdit = (sale: Sale, field: keyof Sale) => {
    setEditingCell({ id: sale.id, field });
    setInlineValue(String(sale[field] || ''));
  };

  const saveInlineEdit = (saleId: string) => {
    if (!editingCell) return;
    const { field } = editingCell;
    
    let updatedVal: any = inlineValue;
    if (field === 'montoTotal') {
      updatedVal = parseFloat(inlineValue) || 0;
    }
    
    onUpdateInlineSale(saleId, { [field]: updatedVal });
    setEditingCell(null);
  };

  // Helper badge color for channel
  const getChannelBadge = (canal: SaleChannel) => {
    const canalClean = canal.trim();
    const canalLower = canalClean.toLowerCase();
    
    let colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    let icon = null;
    
    if (canalLower === 'local') {
      colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      icon = <Store className="w-3 h-3 text-slate-500 dark:text-slate-400" />;
    } else if (canalLower === 'mercadolibre') {
      colorClasses = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80";
      icon = <ShoppingBag className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
    } else if (canalLower === 'woocommerce' || canalLower === 'web' || canalLower === 'woo / web') {
      colorClasses = "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80";
      icon = <ExternalLink className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
    } else if (canalLower === 'whatsapp') {
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      icon = <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
    } else if (canalLower === 'instagram') {
      colorClasses = "bg-pink-50 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800";
      icon = <Instagram className="w-3 h-3 text-pink-600 dark:text-pink-400" />;
    } else if (canalLower === 'venta telefónica' || canalLower === 'venta telefonica' || canalLower === 'telefono') {
      colorClasses = "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      icon = <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
    } else {
      const colors = [
        "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
        "bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        "bg-lime-50 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800",
        "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
        "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
        "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        "bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
        "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
      ];
      let hash = 0;
      for (let i = 0; i < canalLower.length; i++) {
        hash = canalLower.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorClasses = colors[Math.abs(hash) % colors.length];
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
    
    let colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    let icon = <CreditCard className="w-3 h-3 text-slate-400" />;
    
    if (metodoLower === 'efectivo') {
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80";
      icon = <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
    } else if (metodoLower === 'transferencia' || metodoLower === 'banco') {
      colorClasses = "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/80";
      icon = <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
    } else if (metodoLower === 'tarjeta de débito' || metodoLower === 'debito' || metodoLower === 'débito' || metodoLower === 'tarjeta debito') {
      colorClasses = "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80";
      icon = <CreditCard className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />;
    } else if (metodoLower === 'tarjeta de crédito' || metodoLower === 'credito' || metodoLower === 'crédito' || metodoLower === 'tarjeta credito') {
      colorClasses = "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80";
      icon = <CreditCard className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />;
    } else if (metodoLower === 'mercadopago' || metodoLower === 'mp') {
      colorClasses = "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/80";
      icon = <ExternalLink className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
    } else if (metodoLower === 'efectivo contra entrega' || metodoLower === 'contra entrega') {
      colorClasses = "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/80";
      icon = <DollarSign className="w-3 h-3 text-teal-600 dark:text-teal-400" />;
    } else if (metodoLower === 'cheque / ejeq' || metodoLower === 'cheque' || metodoLower === 'echeq' || metodoLower === 'cheque / echeq') {
      colorClasses = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80";
      icon = <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
    } else {
      const colors = [
        "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
        "bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        "bg-lime-50 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800",
        "bg-violet-50 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
      ];
      let hash = 0;
      for (let i = 0; i < metodoLower.length; i++) {
        hash = metodoLower.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorClasses = colors[Math.abs(hash) % colors.length];
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

  const getShippingBadge = (status: ShippingStatus) => {
    return getAndreaniStatusBadge(status);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-0 overflow-hidden transition-colors duration-200">
      
      {/* Spreadsheet Control Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar cliente, nº cliente, nº factura, producto o nº seguimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Canal Filter Dropdown */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Canal:</span>
            <select
              value={selectedChannelFilter}
              onChange={(e) => onChannelFilterChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="TODOS" className="dark:bg-slate-900">Todos los Canales</option>
              {canales.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Pago:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="dark:bg-slate-900">Todos los métodos</option>
              {metodosPago.map((m) => (
                <option key={m} value={m} className="dark:bg-slate-900">{m}</option>
              ))}
            </select>
          </div>

          {/* Shipping Status Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Envío:</span>
            <select
              value={shippingStatusFilter}
              onChange={(e) => setShippingStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="dark:bg-slate-900">Todos los estados</option>
              {estadosEnvio.map((status) => (
                <option key={status} value={status} className="dark:bg-slate-900">{status}</option>
              ))}
            </select>
          </div>

          {/* Column Visibility Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configurar columnas visibles"
            >
              <Columns className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Columnas</span>
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 text-xs space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-700 mb-1 px-1">
                  Mostrar / Ocultar
                </div>
                {Object.keys(visibleColumns).map((colKey) => (
                  <label key={colKey} className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 p-1 rounded cursor-pointer text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={(visibleColumns as any)[colKey]}
                      onChange={(e) =>
                        setVisibleColumns({
                          ...visibleColumns,
                          [colKey]: e.target.checked
                        })
                      }
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0"
                    />
                    <span className="capitalize">{colKey.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Andreani Sync Button */}
          <button
            onClick={handleSyncAndreaniClick}
            disabled={isSyncingAndreani}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-800/80 dark:hover:bg-red-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Sincronizar estados de envíos de Andreani con el servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAndreani ? 'animate-spin' : ''}`} />
            <span>Rastrear Andreani</span>
          </button>

          {/* Quick Add Row Button */}
          <button
            onClick={onQuickAddSale}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Fila Rápida</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar if items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/80 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <span className="font-medium">
            {selectedIds.length} fila(s) seleccionada(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`¿Eliminar ${selectedIds.length} ventas seleccionadas?`)) {
                  selectedIds.forEach((id) => onDeleteSale(id));
                  setSelectedIds([]);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Selección</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* High Density Spreadsheet Table */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse font-sans text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          
          {/* Table Header */}
          <thead className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-20 backdrop-blur-xs select-none">
            <tr className="divide-x divide-slate-100 dark:divide-slate-800">
              <th className="p-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredSales.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-blue-600 focus:ring-0 cursor-pointer"
                />
              </th>

              {visibleColumns.clienteId && (
                <th 
                  onClick={() => handleSort('clienteId')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>NCLI</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.fecha && (
                <th 
                  onClick={() => handleSort('fecha')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.clienteNombre && (
                <th 
                  onClick={() => handleSort('clienteNombre')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.productoNombre && (
                <th className="p-2.5 whitespace-nowrap min-w-[200px]">
                  <span>Producto</span>
                </th>
              )}

              {visibleColumns.montoTotal && (
                <th 
                  onClick={() => handleSort('montoTotal')}
                  className="p-2.5 text-right cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Precio</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.numeroFactura && (
                <th 
                  onClick={() => handleSort('numeroFactura')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Factura</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.canal && (
                <th className="p-2.5 whitespace-nowrap min-w-[120px]">
                  <span>Canal de Venta</span>
                </th>
              )}

              {visibleColumns.metodoPago && (
                <th className="p-2.5 whitespace-nowrap min-w-[120px]">
                  <span>Met. Pago</span>
                </th>
              )}

              {visibleColumns.metodoEnvio && (
                <th className="p-2.5 whitespace-nowrap min-w-[150px]">
                  <span>Método de Envío</span>
                </th>
              )}

              {visibleColumns.numeroSeguimiento && (
                <th className="p-2.5 whitespace-nowrap min-w-[140px]">
                  <span>Nº de Envío</span>
                </th>
              )}

              {visibleColumns.estadoEnvio && (
                <th className="p-2.5 whitespace-nowrap min-w-[110px]">
                  <span>Estado Envío</span>
                </th>
              )}

              {visibleColumns.acciones && (
                <th className="p-2.5 text-center whitespace-nowrap w-24 sticky right-0 bg-slate-50/90 dark:bg-slate-900/90">
                  <span>Acciones</span>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[12px]">
            {paginatedSales.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-12 text-slate-500 dark:text-slate-400 font-sans">
                  <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">No se encontraron ventas registradas</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Prueba modificando la búsqueda, los filtros de canal o agrega una nueva venta.
                    </p>
                    <button
                      onClick={onQuickAddSale}
                      className="mt-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
                    >
                      + Registrar Venta Ahora
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSales.map((sale, idx) => {
                const isSelected = selectedIds.includes(sale.id);
                const firstProduct = sale.productos[0];
                const productCount = sale.productos.length;
                const isAndreani = sale.metodoEnvio?.toLowerCase().includes('andreani');
                const hasTracking = Boolean(sale.numeroSeguimiento && sale.numeroSeguimiento.trim() !== '');

                // Validation check for mandatory required fields: fecha, ncli, producto, precio, met. pago
                const valResult = validateRequiredSaleFields(sale);

                return (
                  <tr 
                    key={sale.id}
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
                        onChange={() => handleSelectRow(sale.id)}
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
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={() => saveInlineEdit(sale.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(sale.id)}
                            autoFocus
                            className="w-24 bg-white dark:bg-slate-800 border border-blue-500 text-right text-emerald-700 dark:text-emerald-400 px-1 py-0.5 rounded focus:outline-none shadow-xs"
                          />
                        ) : (
                          <span 
                            onClick={() => startInlineEdit(sale, 'montoTotal')}
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
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={() => saveInlineEdit(sale.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(sale.id)}
                            autoFocus
                            className="w-32 bg-white dark:bg-slate-800 border border-blue-500 text-slate-900 dark:text-slate-100 px-1 py-0.5 rounded focus:outline-none text-xs shadow-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1 group/fac">
                            <span 
                              onClick={() => startInlineEdit(sale, 'numeroFactura')}
                              className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                              title="Haz clic para editar número de factura"
                            >
                              {sale.numeroFactura || '---'}
                            </span>
                            {sale.numeroFactura && (
                              <button
                                onClick={() => handleCopyText(sale.numeroFactura, `fac-${sale.id}`)}
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

                    {/* Canal / Origen */}
                    {visibleColumns.canal && (
                      <td className="p-2.5 font-sans whitespace-nowrap">
                        {getChannelBadge(sale.canal)}
                      </td>
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
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={() => saveInlineEdit(sale.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(sale.id)}
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
                                onClick={() => startInlineEdit(sale, 'numeroSeguimiento')}
                                className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                                title="Haz clic para editar nº de seguimiento"
                              >
                                {sale.numeroSeguimiento || 'Sin tracking'}
                              </span>
                            )}

                            {sale.numeroSeguimiento && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => startInlineEdit(sale, 'numeroSeguimiento')}
                                  className="opacity-0 group-hover/track:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-opacity"
                                  title="Editar nº seguimiento"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleCopyText(sale.numeroSeguimiento!, `tr-${sale.id}`)}
                                  className="opacity-0 group-hover/track:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-opacity"
                                  title="Copiar nº seguimiento"
                                >
                                  {copiedId === `tr-${sale.id}` ? (
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
                        <div className="flex items-center gap-1.5">
                          <select
                            value={sale.estadoEnvio || 'Pendiente'}
                            onChange={(e) => {
                              const newStatus = e.target.value as ShippingStatus;
                              onUpdateInlineSale(sale.id, {
                                estadoEnvio: newStatus,
                                andreaniStatus: isAndreani ? newStatus : sale.andreaniStatus
                              });
                            }}
                            className="bg-transparent border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans text-slate-800 dark:text-slate-200"
                            title="Seleccionar estado de envío"
                          >
                            {estadosEnvio.map((status) => {
                              let colorClass = "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                              if (status === 'Entregado') colorClass = "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-semibold";
                              else if (status === 'En camino' || status === 'Enviado') colorClass = "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold";
                              else if (status === 'Listo para retirar') colorClass = "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 font-semibold";
                              else if (status === 'No entregado') colorClass = "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 font-semibold";
                              else if (status === 'Pendiente de ingreso' || status === 'Pendiente') colorClass = "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 font-semibold";

                              return (
                                <option key={status} value={status} className={colorClass}>
                                  {status}
                                </option>
                              );
                            })}
                          </select>

                          {isAndreani && (sale.andreaniStatus || sale.estadoEnvio) && (
                            <div title={`Último chequeo Andreani: ${sale.andreaniLastCheck ? new Date(sale.andreaniLastCheck).toLocaleTimeString() : 'Reciente'}`}>
                              {getAndreaniStatusBadge(sale.andreaniStatus || sale.estadoEnvio)}
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Action buttons */}
                    {visibleColumns.acciones && (
                      <td className="p-2 text-center whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 dark:group-hover:bg-slate-800/60">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrintRemito(sale)}
                            className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                            title="Imprimir Remito de Entrega / Despacho"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditSale(sale)}
                            className="p-1 text-slate-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Editar detalle completo de la venta"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Confirma eliminar la venta ${sale.id}?`)) {
                                onDeleteSale(sale.id);
                              }
                            }}
                            className="p-1 text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Eliminar esta venta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
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
              <option key={val} value={val}>{val}</option>
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
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
          >
            Siguiente &gt;
          </button>
        </div>
      </div>

      {/* Spreadsheet Status Footer */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span>
            MOSTRANDO <strong className="text-white font-mono">{paginatedSales.length}</strong> DE <strong className="text-white font-mono">{filteredSales.length}</strong> FILTRADAS (TOTAL: <strong className="text-white font-mono">{sales.length}</strong>)
          </span>
          <span className="hidden sm:inline border-l border-slate-700 pl-4 text-slate-400">
            Haz clic en el monto o número de factura para editar celdas directamente
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">Total Filtrado:</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            {formatCurrency(filteredSales.reduce((acc, s) => acc + s.montoTotal, 0))}
          </span>
        </div>
      </div>

    </div>
  );
};
