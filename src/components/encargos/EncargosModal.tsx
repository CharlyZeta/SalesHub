import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Package,
  Wrench,
  Search,
  ShoppingCart,
  MessageCircle,
  CheckCircle2,
  Clock,
  Truck,
  Copy,
  Printer,
  Edit2,
  Trash2,
  ExternalLink,
  Phone,
  Tag,
  Filter,
} from 'lucide-react';
import { Customer, CatalogProduct, EncargoItem, EncargoEstado, AppConfig } from '../../types';
import {
  getEncargos,
  addEncargo,
  updateEncargo,
  deleteEncargo,
  getEncargosMetrics,
  agruparParaCompras,
  generarMensajeWhatsAppProveedor,
  generarMensajeWhatsAppCliente,
  generarUrlWhatsApp,
  crearProductoDeEncargo,
} from '../../services/encargosService';
import { EncargoFormModal } from './EncargoFormModal';
import { formatCurrency } from '../../utils/formatters';

interface EncargosModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  catalog: CatalogProduct[];
  config?: AppConfig;
  onUpdateCatalog: (newCatalog: CatalogProduct[]) => void;
  onNewSaleWithItem?: (data: { clienteNombre: string; clienteTelefono?: string; productoNombre: string; cantidad: number; precio: number }) => void;
}

export const EncargosModal: React.FC<EncargosModalProps> = ({
  isOpen,
  onClose,
  customers,
  catalog,
  config,
  onUpdateCatalog,
  onNewSaleWithItem,
}) => {
  const [encargos, setEncargos] = useState<EncargoItem[]>([]);
  const [activeTab, setActiveTab] = useState<'tablero' | 'compras'>('tablero');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de alta/edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEncargo, setEditingEncargo] = useState<EncargoItem | null>(null);

  // Notificación tipo toast dentro del modal
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar encargos
  const reloadEncargos = () => {
    setEncargos(getEncargos());
  };

  useEffect(() => {
    if (isOpen) {
      reloadEncargos();
    }
  }, [isOpen]);

  // Métricas
  const metrics = useMemo(() => getEncargosMetrics(encargos), [encargos]);

  // Lista consolidada de compras
  const listaCompras = useMemo(() => agruparParaCompras(encargos, 'pendiente_compra'), [encargos]);

  // Filtrado de encargos para el tablero
  const filteredEncargos = useMemo(() => {
    return encargos.filter((item) => {
      // Filtro por estado
      if (filtroEstado !== 'todos' && item.estado !== filtroEstado) return false;
      // Filtro por tipo
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
      // Búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchProd = item.productoNombre.toLowerCase().includes(query);
        const matchDesc = item.productoDescripcion?.toLowerCase().includes(query) ?? false;
        const matchClient = item.clienteNombre.toLowerCase().includes(query);
        const matchPhone = item.clienteTelefono?.toLowerCase().includes(query) ?? false;
        const matchId = item.id.toLowerCase().includes(query);
        return matchProd || matchDesc || matchClient || matchPhone || matchId;
      }
      return true;
    });
  }, [encargos, filtroEstado, filtroTipo, searchQuery]);

  if (!isOpen) return null;

  // Handlers
  const handleSaveEncargo = (data: any) => {
    if (editingEncargo) {
      updateEncargo(editingEncargo.id, data);
      showToast('Encargo actualizado correctamente.');
    } else {
      addEncargo(data);
      showToast('Encargo registrado con éxito.');
    }
    setEditingEncargo(null);
    reloadEncargos();
  };

  const handleStatusChange = (id: string, nuevoEstado: EncargoEstado) => {
    updateEncargo(id, { estado: nuevoEstado });
    reloadEncargos();
    showToast(`Estado actualizado a: ${formatEstadoBadge(nuevoEstado).label}`);
  };

  const handleDeleteEncargo = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este encargo?')) {
      deleteEncargo(id);
      reloadEncargos();
      showToast('Encargo eliminado.');
    }
  };

  const handleCrearProducto = (encargo: EncargoItem) => {
    const { producto, yaExiste } = crearProductoDeEncargo(encargo, catalog);
    if (yaExiste) {
      showToast(`El producto "${producto.nombre}" ya existe en el catálogo.`);
    } else {
      onUpdateCatalog([producto, ...catalog]);
      updateEncargo(encargo.id, { convertidoEnCatalogo: true });
      reloadEncargos();
      showToast(`¡"${producto.nombre}" incorporado al catálogo exitosamente!`);
    }
  };

  const handleCopiarListaCompras = () => {
    const empresaNombre = config?.empresa?.nombre || 'Mi Empresa';
    const texto = generarMensajeWhatsAppProveedor(listaCompras, empresaNombre);
    if (!texto) {
      showToast('No hay productos pendientes de compra para listar.');
      return;
    }
    navigator.clipboard.writeText(texto);
    showToast('¡Lista de compras copiada al portapapeles!');
  };

  const handleMarcarTodosComoPedidos = () => {
    if (listaCompras.length === 0) return;
    if (window.confirm(`¿Confirmas marcar los ${listaCompras.length} productos agrupados (${encargos.filter(e => e.estado === 'pendiente_compra').length} encargos) como "Pedido a Proveedor"?`)) {
      encargos
        .filter((e) => e.estado === 'pendiente_compra')
        .forEach((e) => updateEncargo(e.id, { estado: 'pedido_proveedor' }));
      reloadEncargos();
      showToast('Todos los ítems pendientes fueron marcados como Pedidos al Proveedor.');
    }
  };

  const handleImprimirLista = () => {
    window.print();
  };

  function formatEstadoBadge(estado: EncargoEstado) {
    switch (estado) {
      case 'pendiente_compra':
        return {
          label: 'Pendiente de Pedir',
          cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
          icon: Clock,
        };
      case 'pedido_proveedor':
        return {
          label: 'Pedido al Proveedor (En camino)',
          cls: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
          icon: Truck,
        };
      case 'recibido':
        return {
          label: 'Recibido en Local (Avisar)',
          cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 animate-pulse',
          icon: Package,
        };
      case 'entregado':
        return {
          label: 'Entregado / Completado',
          cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          icon: CheckCircle2,
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          cls: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
          icon: X,
        };
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Encargos & Lista de Compras</span>
                {metrics.pendientes > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {metrics.pendientes} pendientes
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Demanda de clientes para repuestos y productos que no están en stock ni en catálogo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingEncargo(null);
                setIsFormOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Encargo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notifier */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-semibold text-center animate-in fade-in duration-200">
            {toastMessage}
          </div>
        )}

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-100/60 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Por Pedir al Proveedor</span>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400">{metrics.pendientes}</p>
            </div>
            <Clock className="w-5 h-5 text-amber-500/70" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">En Camino (Pedidos)</span>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">{metrics.pedidos}</p>
            </div>
            <Truck className="w-5 h-5 text-blue-500/70" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Recibidos (Listo p/ Avisar)</span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{metrics.recibidos}</p>
            </div>
            <Package className="w-5 h-5 text-emerald-500/70" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Entregados / Completados</span>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">{metrics.entregados}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* Pestañas de Vista */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tablero')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tablero'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Tablero de Encargos ({encargos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('compras')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'compras'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Lista de Compras Proveedores ({listaCompras.length})</span>
            </button>
          </div>

          {activeTab === 'compras' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopiarListaCompras}
                disabled={listaCompras.length === 0}
                className="bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Copiar lista de compras para pegar en WhatsApp del proveedor"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar p/ WhatsApp</span>
              </button>

              <button
                onClick={handleImprimirLista}
                disabled={listaCompras.length === 0}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Imprimir lista de compras"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={handleMarcarTodosComoPedidos}
                disabled={listaCompras.length === 0}
                className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Marcar todos los ítems de la lista como pedidos al proveedor"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Marcar en Camino</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'tablero' ? (
            <>
              {/* Barra de Filtros y Búsqueda */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pb-2">
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Buscar por artículo, cliente, teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
                    >
                      <option value="todos">Todos los Estados</option>
                      <option value="pendiente_compra">Por Pedir al Proveedor</option>
                      <option value="pedido_proveedor">En Camino (Pedidos)</option>
                      <option value="recibido">Recibidos en Local</option>
                      <option value="entregado">Entregados</option>
                      <option value="cancelado">Cancelados</option>
                    </select>
                  </div>

                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
                  >
                    <option value="todos">Repuestos y Productos</option>
                    <option value="repuesto">Solo Repuestos</option>
                    <option value="producto">Solo Productos</option>
                  </select>
                </div>
              </div>

              {/* Lista / Grilla de Encargos */}
              {filteredEncargos.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    No se encontraron encargos registrados con los filtros actuales.
                  </p>
                  <button
                    onClick={() => {
                      setEditingEncargo(null);
                      setIsFormOpen(true);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar el primer encargo de cliente</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredEncargos.map((item) => {
                    const badge = formatEstadoBadge(item.estado);
                    const mensajeWa = generarMensajeWhatsAppCliente(item, config?.empresa?.nombre);
                    const urlWa = generarUrlWhatsApp(item.clienteTelefono, mensajeWa);

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        {/* Datos del Producto y Encargo */}
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                item.tipo === 'repuesto'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                              }`}
                            >
                              {item.tipo === 'repuesto' ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                              <span>{item.tipo}</span>
                            </span>

                            <span className="font-mono text-[10px] text-slate-400">
                              {item.id}
                            </span>

                            {/* Badge de Estado con selector de cambio rápido */}
                            <div className="relative inline-flex items-center">
                              <select
                                value={item.estado}
                                onChange={(e) => handleStatusChange(item.id, e.target.value as EncargoEstado)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${badge.cls}`}
                              >
                                <option value="pendiente_compra">Por Pedir al Proveedor</option>
                                <option value="pedido_proveedor">En Camino (Pedido)</option>
                                <option value="recibido">Recibido en Local</option>
                                <option value="entregado">Entregado</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {item.productoNombre}
                            </h3>
                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                              x{item.cantidad} u.
                            </span>
                          </div>

                          {item.productoDescripcion && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                              {item.productoDescripcion}
                            </p>
                          )}

                          {/* Info de Cliente y Precios */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
                            <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                              👤 {item.clienteNombre}
                            </span>

                            {item.clienteTelefono && (
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-emerald-500" />
                                {item.clienteTelefono}
                              </span>
                            )}

                            {item.precioEstimado !== undefined && item.precioEstimado > 0 && (
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                Precio Est.: <b>${formatCurrency(item.precioEstimado)}</b>
                              </span>
                            )}

                            {item.seña !== undefined && item.seña > 0 && (
                              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                Seña: ${formatCurrency(item.seña)}
                              </span>
                            )}

                            {item.proveedorSugerido && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Prov: <b>{item.proveedorSugerido}</b>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones Rápidas */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                          {/* Botón WhatsApp si tiene teléfono */}
                          {item.clienteTelefono && urlWa && (
                            <a
                              href={urlWa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                                item.estado === 'recibido'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              }`}
                              title="Avisar por WhatsApp al cliente"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Avisar WhatsApp</span>
                            </a>
                          )}

                          {/* Botón Alta en Catálogo */}
                          {!item.convertidoEnCatalogo && (
                            <button
                              onClick={() => handleCrearProducto(item)}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Dar de alta como producto formal en el catálogo"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Alta Catálogo</span>
                            </button>
                          )}

                          {/* Botón Venta Directa */}
                          {onNewSaleWithItem && (
                            <button
                              onClick={() => {
                                onNewSaleWithItem({
                                  clienteNombre: item.clienteNombre,
                                  clienteTelefono: item.clienteTelefono,
                                  productoNombre: item.productoNombre,
                                  cantidad: item.cantidad,
                                  precio: item.precioEstimado || 0,
                                });
                                onClose();
                              }}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Crear venta directa con este cliente y producto"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Facturar</span>
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            onClick={() => {
                              setEditingEncargo(item);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Editar datos del encargo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteEncargo(item.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Eliminar encargo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Vista Consolidada: Lista de Compras para Proveedor */
            <div className="space-y-4">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Lista de Compras Consolidada (Pendientes)</span>
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Suma las cantidades de artículos iguales para cotizar y pedir al proveedor en un solo envío.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                    Unidades Totales a Pedir
                  </span>
                  <span className="text-xl font-mono font-extrabold text-emerald-900 dark:text-emerald-100">
                    {listaCompras.reduce((acc, i) => acc + i.cantidadTotal, 0)}
                  </span>
                </div>
              </div>

              {listaCompras.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    ¡No hay compras pendientes! Todos los artículos pedidos ya fueron enviados al proveedor o recibidos.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Artículo / Descripción</th>
                        <th className="p-3 text-center">Cant. Total</th>
                        <th className="p-3">Clientes Solicitantes</th>
                        <th className="p-3">Proveedor Sugerido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {listaCompras.map((item) => (
                        <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.tipo === 'repuesto'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {item.tipo}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              {item.productoNombre}
                            </p>
                            {item.productoDescripcion && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                {item.productoDescripcion}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono font-extrabold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
                              {item.cantidadTotal}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="space-y-0.5">
                              {item.clientes.map((c, idx) => (
                                <p key={idx} className="text-[11px] text-slate-600 dark:text-slate-400">
                                  • {c.nombre} <span className="font-mono text-slate-400">({c.cantidad} u.)</span>
                                </p>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {item.proveedorSugerido || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            {encargos.length} encargos registrados · {listaCompras.length} artículos agrupados para compras
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Formulario Alta/Edición */}
      <EncargoFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEncargo(null);
        }}
        onSave={handleSaveEncargo}
        initialEncargo={editingEncargo}
        customers={customers}
      />
    </div>
  );
};
