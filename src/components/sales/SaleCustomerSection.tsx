import React from 'react';
import { UserCheck, Search, Loader2 } from 'lucide-react';
import { Customer, SaleChannel } from '../../types';
import { ARGENTINE_PROVINCES } from '../../utils/formatters';

export interface SaleCustomerSectionProps {
  fecha: string;
  setFecha: (v: string) => void;
  canal: SaleChannel;
  setCanal: (v: SaleChannel) => void;
  canales: string[];
  clienteId: string;
  setClienteId: (v: string) => void;
  clienteNombre: string;
  setClienteNombre: (v: string) => void;
  clienteApellido: string;
  setClienteApellido: (v: string) => void;
  clienteDniCuit: string;
  setClienteDniCuit: (v: string) => void;
  clienteTelefono: string;
  setClienteTelefono: (v: string) => void;
  clienteDireccion: string;
  setClienteDireccion: (v: string) => void;
  clienteLocalidad: string;
  setClienteLocalidad: (v: string) => void;
  clienteCodigoPostal: string;
  setClienteCodigoPostal: (v: string) => void;
  clienteProvincia: string;
  setClienteProvincia: (v: string) => void;
  envioDomicilioDiferente: boolean;
  setEnvioDomicilioDiferente: (v: boolean) => void;
  entregaDireccion: string;
  setEntregaDireccion: (v: string) => void;
  entregaLocalidad: string;
  setEntregaLocalidad: (v: string) => void;
  entregaCodigoPostal: string;
  setEntregaCodigoPostal: (v: string) => void;
  entregaProvincia: string;
  setEntregaProvincia: (v: string) => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (v: boolean) => void;
  isCustomerSearchLoading: boolean;
  setIsCustomerSearchLoading: (v: boolean) => void;
  customers: Customer[];
  handleSelectCustomer: (c: Customer) => void;
}

export const SaleCustomerSection: React.FC<SaleCustomerSectionProps> = ({
  fecha,
  setFecha,
  canal,
  setCanal,
  canales,
  clienteId,
  setClienteId,
  clienteNombre,
  setClienteNombre,
  clienteApellido,
  setClienteApellido,
  clienteDniCuit,
  setClienteDniCuit,
  clienteTelefono,
  setClienteTelefono,
  clienteDireccion,
  setClienteDireccion,
  clienteLocalidad,
  setClienteLocalidad,
  clienteCodigoPostal,
  setClienteCodigoPostal,
  clienteProvincia,
  setClienteProvincia,
  envioDomicilioDiferente,
  setEnvioDomicilioDiferente,
  entregaDireccion,
  setEntregaDireccion,
  entregaLocalidad,
  setEntregaLocalidad,
  entregaCodigoPostal,
  setEntregaCodigoPostal,
  entregaProvincia,
  setEntregaProvincia,
  customerSearch,
  setCustomerSearch,
  showCustomerDropdown,
  setShowCustomerDropdown,
  isCustomerSearchLoading,
  setIsCustomerSearchLoading,
  customers,
  handleSelectCustomer
}) => {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>Información General & Cliente</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Fecha */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Fecha de Venta *</label>
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono shadow-xs"
          />
        </div>

        {/* Canal / Origen */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Canal de Venta *</label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as SaleChannel)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            {canales.map((c) => (
              <option key={c} value={c} className="dark:bg-slate-900">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ID Cliente Interno */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº Cliente Interno</label>
          <input
            type="text"
            placeholder="Ej: CLI-1002 (auto)"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-blue-600 dark:text-blue-400 font-mono focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Quick Customer Search Autocomplete */}
        <div className="relative customer-search-container">
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Buscar Cliente Existente</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
                setIsCustomerSearchLoading(true);
                setTimeout(() => setIsCustomerSearchLoading(false), 150);
              }}
              onFocus={() => {
                setShowCustomerDropdown(true);
                setIsCustomerSearchLoading(true);
                setTimeout(() => setIsCustomerSearchLoading(false), 150);
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
            />
            {isCustomerSearchLoading ? (
              <Loader2 className="w-3.5 h-3.5 absolute left-2.5 top-2 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
            )}
          </div>

          {showCustomerDropdown && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-20 max-h-48 overflow-y-auto">
              {isCustomerSearchLoading ? (
                <div className="p-3 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Cargando clientes ({customers.length})...</span>
                </div>
              ) : (
                <>
                  {customers
                    .filter((c) => {
                      if (customerSearch.trim() === '') return true;
                      return `${c.nombre} ${c.apellido} ${c.clienteId} ${c.dniCuit}`
                        .toLowerCase()
                        .includes(customerSearch.toLowerCase());
                    })
                    .slice(0, 25)
                    .map((c) => (
                      <div
                        key={c.clienteId}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {c.nombre} {c.apellido}
                          </span>
                          <span className="ml-2 font-mono text-blue-600 dark:text-blue-400 text-[10px]">
                            {c.clienteId}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[10px]">{c.dniCuit}</span>
                      </div>
                    ))}
                  {customers.filter((c) => {
                    if (customerSearch.trim() === '') return true;
                    return `${c.nombre} ${c.apellido} ${c.clienteId} ${c.dniCuit}`
                      .toLowerCase()
                      .includes(customerSearch.toLowerCase());
                  }).length === 0 && (
                    <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400">
                      No se encontraron clientes
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Details Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Nombre *</label>
          <input
            type="text"
            required
            placeholder="Juan"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Apellido</label>
          <input
            type="text"
            placeholder="Pérez"
            value={clienteApellido}
            onChange={(e) => setClienteApellido(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">DNI / CUIT</label>
          <input
            type="text"
            placeholder="20-30123456-7"
            value={clienteDniCuit}
            onChange={(e) => setClienteDniCuit(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono shadow-xs"
          />
        </div>
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Teléfono</label>
          <input
            type="text"
            placeholder="342-4500000"
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
        <div className="sm:col-span-4">
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Domicilio del Cliente</label>
          <input
            type="text"
            placeholder="Calle y altura"
            value={clienteDireccion}
            onChange={(e) => setClienteDireccion(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Localidad Cliente</label>
          <input
            type="text"
            placeholder="Localidad"
            value={clienteLocalidad}
            onChange={(e) => setClienteLocalidad(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Código Postal</label>
          <input
            type="text"
            placeholder="CP (ej: 3000)"
            value={clienteCodigoPostal}
            onChange={(e) => setClienteCodigoPostal(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs font-mono"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-slate-500 dark:text-slate-400 mb-1">Provincia Cliente</label>
          <select
            value={clienteProvincia}
            onChange={(e) => setClienteProvincia(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            {ARGENTINE_PROVINCES.map((prov) => (
              <option key={prov} value={prov} className="dark:bg-slate-900">
                {prov}
              </option>
            ))}
            {!ARGENTINE_PROVINCES.includes(clienteProvincia) && clienteProvincia && (
              <option value={clienteProvincia} className="dark:bg-slate-900">
                {clienteProvincia}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Opción de domicilio alternativo */}
      <div className="col-span-12 mt-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={envioDomicilioDiferente}
            onChange={(e) => setEnvioDomicilioDiferente(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <span>¿Enviar a un domicilio diferente al del cliente?</span>
        </label>

        {envioDomicilioDiferente && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="sm:col-span-4">
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Dirección de Entrega *</label>
              <input
                type="text"
                placeholder="Calle y número"
                value={entregaDireccion}
                onChange={(e) => setEntregaDireccion(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                required
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Localidad de Entrega *</label>
              <input
                type="text"
                placeholder="Ej: Rosario"
                value={entregaLocalidad}
                onChange={(e) => setEntregaLocalidad(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-500 dark:text-slate-400 mb-1">CP Entrega</label>
              <input
                type="text"
                placeholder="CP (ej: 2000)"
                value={entregaCodigoPostal}
                onChange={(e) => setEntregaCodigoPostal(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs font-mono"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Provincia Entrega *</label>
              <select
                value={entregaProvincia}
                onChange={(e) => setEntregaProvincia(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                required
              >
                {ARGENTINE_PROVINCES.map((prov) => (
                  <option key={prov} value={prov} className="dark:bg-slate-900">
                    {prov}
                  </option>
                ))}
                {!ARGENTINE_PROVINCES.includes(entregaProvincia) && entregaProvincia && (
                  <option value={entregaProvincia} className="dark:bg-slate-900">
                    {entregaProvincia}
                  </option>
                )}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
