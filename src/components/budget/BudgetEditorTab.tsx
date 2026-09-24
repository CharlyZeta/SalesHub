import React from 'react';
import { UserCheck, Search, Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Budget, BudgetItem, Customer, CatalogProduct, AppConfig } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ProductSearchPicker } from '../ProductSearchPicker';
import { BudgetCalculationResult } from '../../hooks/useBudgetCalculation';

export interface BudgetEditorTabProps {
  selectedBudget: Budget | null;
  config: AppConfig;
  customers: Customer[];
  catalog: CatalogProduct[];
  fechaEmision: string;
  setFechaEmision: (v: string) => void;
  esClienteAgendado: boolean;
  setEsClienteAgendado: (v: boolean) => void;
  selectedCustomerSearch: string;
  setSelectedCustomerSearch: (v: string) => void;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (v: boolean) => void;
  isCustomerSearchLoading: boolean;
  setIsCustomerSearchLoading: (v: boolean) => void;
  clienteId: string;
  razonSocialNombre: string;
  setRazonSocialNombre: (v: string) => void;
  apellido: string;
  setApellido: (v: string) => void;
  dniCuit: string;
  setDniCuit: (v: string) => void;
  domicilio: string;
  setDomicilio: (v: string) => void;
  telefono: string;
  setTelefono: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  codigoPostal: string;
  setCodigoPostal: (v: string) => void;
  condicionFiscal: string;
  setCondicionFiscal: (v: string) => void;
  condicionVenta: string;
  setCondicionVenta: (v: string) => void;
  items: BudgetItem[];
  percepciones: number;
  setPercepciones: (v: number) => void;
  observaciones: string;
  setObservaciones: (v: string) => void;
  customerDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleSelectCustomer: (c: Customer) => void;
  handleAddItemRow: () => void;
  handleRemoveItemRow: (idx: number) => void;
  handleItemChange: (idx: number, field: keyof BudgetItem, val: any) => void;
  handleSelectCatalogItem: (idx: number, cat: CatalogProduct) => void;
  calculations: BudgetCalculationResult;
  handleSubmitForm: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const BudgetEditorTab: React.FC<BudgetEditorTabProps> = ({
  selectedBudget,
  config,
  customers,
  catalog,
  fechaEmision,
  setFechaEmision,
  esClienteAgendado,
  setEsClienteAgendado,
  selectedCustomerSearch,
  setSelectedCustomerSearch,
  showCustomerDropdown,
  setShowCustomerDropdown,
  isCustomerSearchLoading,
  setIsCustomerSearchLoading,
  clienteId: _clienteId,
  razonSocialNombre,
  setRazonSocialNombre,
  apellido,
  setApellido,
  dniCuit,
  setDniCuit,
  domicilio,
  setDomicilio,
  telefono,
  setTelefono,
  email,
  setEmail,
  codigoPostal,
  setCodigoPostal,
  condicionFiscal,
  setCondicionFiscal,
  condicionVenta,
  setCondicionVenta,
  items,
  percepciones,
  setPercepciones,
  observaciones,
  setObservaciones,
  customerDropdownRef,
  handleSelectCustomer,
  handleAddItemRow,
  handleRemoveItemRow,
  handleItemChange,
  handleSelectCatalogItem,
  calculations,
  handleSubmitForm,
  onClose
}) => {
  return (
    <form onSubmit={handleSubmitForm} className="space-y-5">
      {/* Header Box: Secuencia & Fecha */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Nº Presupuesto Secuencial:</span>
          <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded">
            {selectedBudget
              ? selectedBudget.numeroPresupuesto
              : `P${(config.puntoVentaPresupuesto || '0001').padStart(4, '0')}-${((config.ultimoNumeroPresupuesto || 311) + 1).toString().padStart(8, '0')}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-semibold text-slate-700 dark:text-slate-300">Fecha de Emisión:</label>
          <input
            type="date"
            required
            value={fechaEmision}
            onChange={(e) => setFechaEmision(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Section: Customer Type */}
      <div className="bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Datos del Cliente / Destinatario
          </span>

          {/* Toggle Agendado vs Eventual */}
          <div className="flex bg-slate-200/80 dark:bg-slate-900 p-0.5 rounded-md font-medium text-[11px]">
            <button
              type="button"
              onClick={() => setEsClienteAgendado(false)}
              className={`px-3 py-1 rounded-sm transition-colors cursor-pointer ${
                !esClienteAgendado
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cliente Eventual
            </button>
            <button
              type="button"
              onClick={() => setEsClienteAgendado(true)}
              className={`px-3 py-1 rounded-sm transition-colors cursor-pointer ${
                esClienteAgendado
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cliente Agendado
            </button>
          </div>
        </div>

        {/* Cliente Agendado Autocomplete */}
        {esClienteAgendado && (
          <div className="relative" ref={customerDropdownRef}>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Buscar Cliente en Directorio</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribe nombre, apellido o DNI..."
                value={selectedCustomerSearch}
                onChange={(e) => {
                  setSelectedCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                  setIsCustomerSearchLoading(true);
                  setTimeout(() => setIsCustomerSearchLoading(false), 150);
                }}
                onFocus={() => {
                  setShowCustomerDropdown(true);
                  setIsCustomerSearchLoading(true);
                  setTimeout(() => setIsCustomerSearchLoading(false), 150);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              {isCustomerSearchLoading ? (
                <Loader2 className="w-3.5 h-3.5 absolute left-2.5 top-2 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
              )}
            </div>

            {showCustomerDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-20 max-h-48 overflow-y-auto">
                {isCustomerSearchLoading ? (
                  <div className="p-3 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span>Cargando clientes ({customers.length})...</span>
                  </div>
                ) : (
                  <>
                    {customers
                      .filter((c) =>
                        `${c.nombre} ${c.apellido} ${c.clienteId} ${c.dniCuit}`
                          .toLowerCase()
                          .includes(selectedCustomerSearch.toLowerCase())
                      )
                      .slice(0, 25)
                      .map((c) => (
                        <div
                          key={c.clienteId}
                          onClick={() => handleSelectCustomer(c)}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {c.nombre} {c.apellido}
                            </span>
                            <span className="ml-2 font-mono text-blue-600 dark:text-blue-400 text-[10px]">
                              {c.clienteId}
                            </span>
                          </div>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                            {c.dniCuit || 'Sin DNI'}
                          </span>
                        </div>
                      ))}
                    {customers.filter((c) =>
                      `${c.nombre} ${c.apellido} ${c.clienteId} ${c.dniCuit}`
                        .toLowerCase()
                        .includes(selectedCustomerSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400">
                        No se encontraron clientes
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Customer Details Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Nombre / Razón Social *</label>
            <input
              type="text"
              required
              placeholder="Ej: CONSUMIDOR FINAL o Mi Empresa S.R.L."
              value={razonSocialNombre}
              onChange={(e) => setRazonSocialNombre(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Apellido (Si aplica)</label>
            <input
              type="text"
              placeholder="Pérez / Rossi..."
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">DNI / CUIT</label>
            <input
              type="text"
              placeholder="20-30123456-7 (DNI) / 30-71234567-8 (CUIT)"
              value={dniCuit}
              onChange={(e) => setDniCuit(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Domicilio</label>
            <input
              type="text"
              placeholder="Calle 123, Santa Fe"
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              placeholder="342-5551234"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Correo Electrónico (Email)</label>
            <input
              type="email"
              placeholder="cliente@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Código Postal (CP)</label>
            <input
              type="text"
              placeholder="3000"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Condición Fiscal</label>
            <select
              value={condicionFiscal}
              onChange={(e) => setCondicionFiscal(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="CONSUMIDOR FINAL">CONSUMIDOR FINAL</option>
              <option value="RESPONSABLE INSCRIPTO">RESPONSABLE INSCRIPTO</option>
              <option value="MONOTRIBUTO">MONOTRIBUTO</option>
              <option value="EXENTO">EXENTO</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Condición de Venta</label>
            <select
              value={condicionVenta}
              onChange={(e) => setCondicionVenta(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
            >
              <option value="CONTADO">CONTADO / EFECTIVO</option>
              <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA</option>
              <option value="CUENTA CORRIENTE">CUENTA CORRIENTE (15/30 DÍAS)</option>
              <option value="TARJETA DE DÉBITO">TARJETA DE DÉBITO</option>
              <option value="TARJETA DE CRÉDITO">TARJETA DE CRÉDITO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section: Items Table */}
      <div className="bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
            Productos y Servicios Cotizados
          </span>
          <button
            type="button"
            onClick={handleAddItemRow}
            className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium px-2.5 py-1 rounded text-xs flex items-center gap-1 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Renglón</span>
          </button>
        </div>

        {/* Dynamic Items Rows */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="grid grid-cols-12 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 items-center shadow-2xs"
            >
              {/* Product Picker & Description */}
              <div className="col-span-12 sm:col-span-5">
                <ProductSearchPicker
                  catalog={catalog}
                  onSelectProduct={(cat) => handleSelectCatalogItem(idx, cat)}
                  currentValue={item.descripcion}
                  onChangeValue={(val) => handleItemChange(idx, 'descripcion', val)}
                  selectedImageUrl={item.imagenUrl}
                  placeholder="Buscar producto o escribir item manual..."
                />
              </div>

              {/* Cantidad */}
              <div className="col-span-3 sm:col-span-2">
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Cant.</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={item.cantidad}
                  onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-center focus:outline-none font-mono"
                />
              </div>

              {/* Precio Unitario */}
              <div className="col-span-4 sm:col-span-2">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400">P. Unit. ($)</label>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-sans">Editable</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={item.precioUnitario}
                  onChange={(e) => handleItemChange(idx, 'precioUnitario', e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-right focus:outline-none font-mono font-medium focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              {/* % Descuento */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">% Desc.</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={item.descuentoPorcentaje}
                  onChange={(e) => handleItemChange(idx, 'descuentoPorcentaje', e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-1 py-1 rounded text-center focus:outline-none font-mono text-[11px]"
                />
              </div>

              {/* Subtotal & Actions */}
              <div className="col-span-3 sm:col-span-2 flex items-center justify-between pl-1">
                <div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">SubTotal</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItemRow(idx)}
                  className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors cursor-pointer"
                  title="Eliminar fila"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Subtotals & Percepciones */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Observaciones / Notas para el cliente</label>
            <textarea
              rows={2}
              placeholder="Presupuesto válido por 15 días. Sujeto a disponibilidad de stock..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 text-right font-mono bg-slate-100/60 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Sub Total:</span>
              <span>{formatCurrency(calculations.rawSubtotal)}</span>
            </div>
            {calculations.descuentoTotal > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Descuento:</span>
                <span>- {formatCurrency(calculations.descuentoTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-300 items-center">
              <span className="font-sans text-xs">Percepciones ($):</span>
              <input
                type="number"
                min="0"
                value={percepciones}
                onChange={(e) => setPercepciones(Number(e.target.value))}
                className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 border-t border-slate-300 dark:border-slate-700 pt-1">
              <span>IMPORTE TOTAL:</span>
              <span className="text-blue-700 dark:text-blue-400">{formatCurrency(calculations.importeTotalCalculado)}</span>
            </div>
            <p className="text-[10px] font-sans italic text-slate-500 dark:text-slate-400 text-left pt-1">
              Son Pesos: {calculations.totalEnLetras}
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-md flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Guardar Presupuesto y Generar PDF</span>
        </button>
      </div>
    </form>
  );
};
