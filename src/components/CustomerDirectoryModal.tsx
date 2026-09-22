import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { X, Users, Search, Plus, UserCheck, ShoppingBag, Phone, MapPin, Loader2 } from 'lucide-react';
import { Customer, Sale } from '../types';
import { formatCurrency, formatDate, normalizePersonName, ARGENTINE_PROVINCES, DEFAULT_PROVINCE } from '../utils/formatters';
import { addSystemLog } from '../utils/logger';
import { buildSalesCustomerIndex, filterCustomers, CustomerSalesSummary } from '../utils/customerIndex';

interface CustomerDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  sales: Sale[];
  onAddCustomer: (customer: Customer) => void;
}

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <CustomerDirectoryModalInner {...props} />;
};

const CustomerDirectoryModalInner: React.FC<CustomerDirectoryModalProps> = ({
  onClose,
  customers,
  sales,
  onAddCustomer
}) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const isSearching = deferredSearch !== search;

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Pre-indexar las ventas por clienteId en un Map O(1)
  const salesByCustomer = useMemo(() => buildSalesCustomerIndex(sales), [sales]);

  const EMPTY_SUMMARY: CustomerSalesSummary = { count: 0, total: 0, sales: [] };
  const getCustomerSummary = (clienteId: string): CustomerSalesSummary => {
    return salesByCustomer.get(clienteId) || EMPTY_SUMMARY;
  };

  // Lista de clientes filtrada de manera reactiva y no bloqueante
  const filteredCustomers = useMemo(() => {
    return filterCustomers(customers, deferredSearch);
  }, [customers, deferredSearch]);

  // Paginación progresiva para mantener el DOM ultra liviano
  const PAGE_SIZE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset de la paginación al cambiar el filtro
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch]);

  const visibleCustomers = useMemo(() => {
    return filteredCustomers.slice(0, visibleCount);
  }, [filteredCustomers, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 120 && visibleCount < filteredCustomers.length) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredCustomers.length));
    }
  };

  // Estados para el formulario de nuevo cliente
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newDniCuit, setNewDniCuit] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [newLocalidad, setNewLocalidad] = useState('');
  const [newCodigoPostal, setNewCodigoPostal] = useState('');
  const [newProvincia, setNewProvincia] = useState(DEFAULT_PROVINCE);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      alert('Ingresa el nombre del cliente');
      return;
    }

    try {
      const created: Customer = {
        clienteId: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        nombre: normalizePersonName(newNombre),
        apellido: normalizePersonName(newApellido),
        dniCuit: newDniCuit.trim(),
        telefono: newTelefono.trim(),
        email: newEmail.trim(),
        direccion: newDireccion.trim(),
        localidad: newLocalidad.trim(),
        codigoPostal: newCodigoPostal.trim(),
        provincia: newProvincia.trim() || DEFAULT_PROVINCE,
        totalCompras: 0,
        cantidadPedidos: 0,
        ultimaCompra: new Date().toISOString().split('T')[0]
      };

      onAddCustomer(created);
      addSystemLog('INFO', 'Clientes', `Nuevo cliente registrado: ${created.nombre} ${created.apellido || ''} (${created.clienteId})`, {
        dniCuit: created.dniCuit,
        telefono: created.telefono,
        direccion: created.direccion
      });

      setShowAddForm(false);
      setNewNombre('');
      setNewApellido('');
      setNewDniCuit('');
      setNewTelefono('');
      setNewEmail('');
      setNewDireccion('');
      setNewLocalidad('');
      setNewCodigoPostal('');
      setNewProvincia(DEFAULT_PROVINCE);
    } catch (err: any) {
      console.error('Error al registrar cliente:', err);
      addSystemLog('ERROR', 'Clientes', `Error al registrar cliente: ${err?.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 p-2 rounded-lg border border-indigo-200 dark:border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Directorio de Clientes Internos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Búsqueda, gestión de números de clientes y consultas de historial de compras
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Cliente</span>
            </button>
            <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-800 dark:text-slate-200">
          {/* Add New Customer Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleCreateCustomer} className="bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-500/40 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-1">
                <UserCheck className="w-4 h-4" />
                Registrar Nuevo Cliente
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Apellido</label>
                  <input
                    type="text"
                    placeholder="Ej: Pérez"
                    value={newApellido}
                    onChange={(e) => setNewApellido(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">DNI / CUIT</label>
                  <input
                    type="text"
                    value={newDniCuit}
                    onChange={(e) => setNewDniCuit(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Teléfono</label>
                  <input
                    type="text"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Dirección de Entrega por Defecto</label>
                  <input
                    type="text"
                    placeholder="Calle y número"
                    value={newDireccion}
                    onChange={(e) => setNewDireccion(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Localidad</label>
                  <input
                    type="text"
                    placeholder="Ej: Rosario"
                    value={newLocalidad}
                    onChange={(e) => setNewLocalidad(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Código Postal</label>
                  <input
                    type="text"
                    placeholder="Ej: 2000"
                    value={newCodigoPostal}
                    onChange={(e) => setNewCodigoPostal(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Provincia</label>
                  <select
                    value={newProvincia}
                    onChange={(e) => setNewProvincia(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {ARGENTINE_PROVINCES.map((prov) => (
                      <option key={prov} value={prov} className="dark:bg-slate-900">{prov}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-3 py-1 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white font-medium px-4 py-1 rounded cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Search bar */}
          <div className="relative">
            {isSearching ? (
              <Loader2 className="w-4 h-4 absolute left-3 top-2.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            )}
            <input
              type="text"
              placeholder="Buscar cliente por nombre, ID interno (CLI-1001), CUIT o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md pl-9 pr-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Customer list and history split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left: Customer Cards list */}
            <div onScroll={handleScroll} className="space-y-2 max-h-96 overflow-y-auto pr-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  Listado de Clientes ({filteredCustomers.length})
                </h3>
                {visibleCustomers.length < filteredCustomers.length && (
                  <span className="text-[10px] text-slate-400">
                    Mostrando {visibleCustomers.length} de {filteredCustomers.length}
                  </span>
                )}
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <p className="font-semibold text-xs">No se encontraron clientes</p>
                  <p className="text-[11px] mt-1">Prueba con otro término de búsqueda o registra un nuevo cliente.</p>
                </div>
              ) : (
                <>
                  {visibleCustomers.map((c) => {
                    const summary = getCustomerSummary(c.clienteId);
                    const isSelected = selectedCustomer?.clienteId === c.clienteId;

                    return (
                      <div
                        key={c.clienteId}
                        onClick={() => setSelectedCustomer(c)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-700 dark:text-cyan-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-[11px] font-bold">
                              {c.clienteId}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {c.nombre} {c.apellido}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(summary.total)}
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                          {c.dniCuit && <span>CUIT: {c.dniCuit}</span>}
                          {c.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {c.telefono}</span>}
                          {(c.direccion || c.localidad || c.provincia) && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {[c.direccion, c.localidad].filter(Boolean).join(', ')}</span>
                          )}
                          <span>Ventas: <strong className="text-slate-800 dark:text-slate-200">{summary.count}</strong></span>
                        </div>
                      </div>
                    );
                  })}

                  {visibleCustomers.length < filteredCustomers.length && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredCustomers.length))}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                      >
                        Mostrar más ({filteredCustomers.length - visibleCustomers.length} restantes)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Selected Customer Purchase History */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              {selectedCustomer ? (
                (() => {
                  const summary = getCustomerSummary(selectedCustomer.clienteId);
                  return (
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {selectedCustomer.nombre} {selectedCustomer.apellido}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Cliente {selectedCustomer.clienteId} | Registrado en Directorio
                          </p>
                        </div>
                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          {selectedCustomer.cantidadPedidos || summary.count} Pedidos
                        </span>
                      </div>

                      {/* Contact and address metadata */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block">CUIT / DNI:</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedCustomer.dniCuit || 'No informado'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block">Teléfono:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{selectedCustomer.telefono || 'No informado'}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 dark:text-slate-500 block">Email:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{selectedCustomer.email || 'No informado'}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 dark:text-slate-500 block">Domicilio Registrado:</span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {[
                              selectedCustomer.direccion,
                              selectedCustomer.localidad,
                              selectedCustomer.codigoPostal ? `CP ${selectedCustomer.codigoPostal}` : '',
                              selectedCustomer.provincia
                            ].filter(Boolean).join(', ') || 'No especificado'}
                          </strong>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1 pt-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                        Historial de Compras ({summary.count})
                      </h4>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {summary.sales.length === 0 ? (
                          <p className="text-slate-400 dark:text-slate-500 text-xs py-4 text-center">No tiene compras registradas en el sistema.</p>
                        ) : (
                          summary.sales.map((s) => (
                            <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded text-xs flex items-center justify-between">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400 font-sans">{formatDate(s.fecha)}</span>
                                <span className="ml-2 font-mono text-slate-700 dark:text-slate-300">{s.numeroFactura}</span>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                  {s.productos.map((p) => p.nombre).join(', ')}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.montoTotal)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12">
                  <Users className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-600" />
                  <span>Selecciona un cliente de la lista para consultar su historial completo</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
