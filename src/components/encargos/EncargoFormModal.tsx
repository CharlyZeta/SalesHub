import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  User,
  Wrench,
  Package,
  Search,
  Phone,
  FileText,
  Building,
} from 'lucide-react';
import { Customer, EncargoItem, EncargoTipo } from '../../types';

interface EncargoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<EncargoItem, 'id' | 'fechaRegistro' | 'estado'> & Partial<Pick<EncargoItem, 'id'>>) => void;
  initialEncargo?: EncargoItem | null;
  customers: Customer[];
}

export const EncargoFormModal: React.FC<EncargoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEncargo,
  customers,
}) => {
  const [tipo, setTipo] = useState<EncargoTipo>('repuesto');
  const [productoNombre, setProductoNombre] = useState('');
  const [productoDescripcion, setProductoDescripcion] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioEstimado, setPrecioEstimado] = useState<string>('');
  const [seña, setSeña] = useState<string>('');
  const [proveedorSugerido, setProveedorSugerido] = useState('');
  const [notas, setNotas] = useState('');

  // Cliente
  const [clienteTipo, setClienteTipo] = useState<'agendado' | 'prospecto'>('prospecto');
  const [clienteId, setClienteId] = useState<string | undefined>();
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteDniCuit, setClienteDniCuit] = useState('');
  const [clienteLocalidad, setClienteLocalidad] = useState('');

  // Búsqueda de cliente agendado
  const [searchClienteText, setSearchClienteText] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  // Inicializar formulario
  useEffect(() => {
    if (initialEncargo) {
      setTipo(initialEncargo.tipo);
      setProductoNombre(initialEncargo.productoNombre);
      setProductoDescripcion(initialEncargo.productoDescripcion || '');
      setCantidad(initialEncargo.cantidad || 1);
      setPrecioEstimado(initialEncargo.precioEstimado ? String(initialEncargo.precioEstimado) : '');
      setSeña(initialEncargo.seña ? String(initialEncargo.seña) : '');
      setProveedorSugerido(initialEncargo.proveedorSugerido || '');
      setNotas(initialEncargo.notas || '');

      setClienteTipo(initialEncargo.clienteTipo);
      setClienteId(initialEncargo.clienteId);
      setClienteNombre(initialEncargo.clienteNombre);
      setClienteTelefono(initialEncargo.clienteTelefono || '');
      setClienteEmail(initialEncargo.clienteEmail || '');
      setClienteDniCuit(initialEncargo.clienteDniCuit || '');
      setClienteLocalidad(initialEncargo.clienteLocalidad || '');
      setSearchClienteText(initialEncargo.clienteNombre);
    } else {
      setTipo('repuesto');
      setProductoNombre('');
      setProductoDescripcion('');
      setCantidad(1);
      setPrecioEstimado('');
      setSeña('');
      setProveedorSugerido('');
      setNotas('');

      setClienteTipo('prospecto');
      setClienteId(undefined);
      setClienteNombre('');
      setClienteTelefono('');
      setClienteEmail('');
      setClienteDniCuit('');
      setClienteLocalidad('');
      setSearchClienteText('');
    }
  }, [initialEncargo, isOpen]);

  // Click outside para cerrar dropdown de búsqueda de cliente
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filtrado de clientes agendados
  const filteredCustomers = searchClienteText.trim()
    ? customers.filter((c) => {
        const query = searchClienteText.toLowerCase().trim();
        const fullName = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
        const phone = (c.telefono || '').toLowerCase();
        const doc = (c.dniCuit || '').toLowerCase();
        return fullName.includes(query) || phone.includes(query) || doc.includes(query);
      }).slice(0, 6)
    : [];

  const handleSelectCustomer = (customer: Customer) => {
    const fullName = `${customer.nombre} ${customer.apellido || ''}`.trim();
    setClienteTipo('agendado');
    setClienteId(customer.clienteId);
    setClienteNombre(fullName);
    setClienteTelefono(customer.telefono || '');
    setClienteEmail(customer.email || '');
    setClienteDniCuit(customer.dniCuit || '');
    setClienteLocalidad(customer.localidad || '');
    setSearchClienteText(fullName);
    setShowClienteDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productoNombre.trim()) {
      alert('Por favor, ingresa el nombre o descripción del producto o repuesto.');
      return;
    }

    if (!clienteNombre.trim()) {
      alert('Por favor, indica el nombre del cliente o prospecto.');
      return;
    }

    onSave({
      id: initialEncargo?.id,
      tipo,
      productoNombre: productoNombre.trim(),
      productoDescripcion: productoDescripcion.trim() || undefined,
      cantidad: Math.max(1, cantidad),
      precioEstimado: precioEstimado ? Math.max(0, parseFloat(precioEstimado)) : undefined,
      seña: seña ? Math.max(0, parseFloat(seña)) : undefined,
      clienteTipo,
      clienteId,
      clienteNombre: clienteNombre.trim(),
      clienteTelefono: clienteTelefono.trim() || undefined,
      clienteEmail: clienteEmail.trim() || undefined,
      clienteDniCuit: clienteDniCuit.trim() || undefined,
      clienteLocalidad: clienteLocalidad.trim() || undefined,
      proveedorSugerido: proveedorSugerido.trim() || undefined,
      notas: notas.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg text-white ${tipo === 'repuesto' ? 'bg-amber-600' : 'bg-blue-600'}`}>
              {tipo === 'repuesto' ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {initialEncargo ? 'Editar Encargo' : 'Nuevo Encargo de Cliente'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Para repuestos o productos que no están en stock ni en catálogo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Selector de Tipo (Repuesto vs Producto) */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('repuesto')}
              className={`flex-1 py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tipo === 'repuesto'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Es un Repuesto / Pieza</span>
            </button>
            <button
              type="button"
              onClick={() => setTipo('producto')}
              className={`flex-1 py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tipo === 'producto'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Es un Producto / Accesorio</span>
            </button>
          </div>

          {/* Bloque 1: Producto / Repuesto Solicitado */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Detalles del Artículo Solicitado</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nombre del Repuesto / Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={tipo === 'repuesto' ? 'Ej: Filtro de aire motor, Correa distribución...' : 'Ej: Linterna LED táctica, Batería 12V 7Ah...'}
                value={productoNombre}
                onChange={(e) => setProductoNombre(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Marca / Modelo compatible / Cód. Parte
                </label>
                <input
                  type="text"
                  placeholder="Ej: Modelo 2021, N° de parte 44321..."
                  value={productoDescripcion}
                  onChange={(e) => setProductoDescripcion(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Proveedor / Distribuidor sugerido
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej: Distribuidora Norte, Bosch..."
                    value={proveedorSugerido}
                    onChange={(e) => setProveedorSugerido(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Precio Estimado ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={precioEstimado}
                  onChange={(e) => setPrecioEstimado(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Seña dejada ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={seña}
                  onChange={(e) => setSeña(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Datos del Cliente o Prospecto */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Datos del Cliente / Prospecto</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                clienteTipo === 'agendado'
                  ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
              }`}>
                {clienteTipo === 'agendado' ? 'Cliente Agendado' : 'Prospecto Nuevo'}
              </span>
            </div>

            {/* Buscador de clientes agendados existentes */}
            <div className="relative" ref={clienteDropdownRef}>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Buscar cliente en agenda (o escribir prospecto nuevo directo abajo):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escribir nombre, teléfono o DNI para buscar cliente agendado..."
                  value={searchClienteText}
                  onChange={(e) => {
                    setSearchClienteText(e.target.value);
                    setClienteNombre(e.target.value);
                    setClienteTipo('prospecto');
                    setClienteId(undefined);
                    setShowClienteDropdown(true);
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Dropdown de autocompletado */}
              {showClienteDropdown && filteredCustomers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.clienteId}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-2 hover:bg-indigo-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.nombre} {c.apellido || ''}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {c.telefono ? `📞 ${c.telefono}` : ''} {c.localidad ? `📍 ${c.localidad}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 font-bold shrink-0">
                        Seleccionar
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campos de contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nombre del Contacto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellido del cliente"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-500" />
                  <span>Teléfono / WhatsApp (para aviso de llegada)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: 341-5551234 (fundamental para avisar)"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-2xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Localidad / Zona (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rosario, Funes..."
                  value={clienteLocalidad}
                  onChange={(e) => setClienteLocalidad(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  DNI / CUIT (opcional)
                </label>
                <input
                  type="text"
                  placeholder="DNI o CUIT si lo tiene a mano"
                  value={clienteDniCuit}
                  onChange={(e) => setClienteDniCuit(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Notas y Observaciones */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Observaciones / Requisitos especiales</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Trae la muestra el martes, pide color negro si viene disponible, prioridad alta..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialEncargo ? 'Guardar Cambios' : 'Registrar Encargo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
