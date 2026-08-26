import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, UserCheck, ShoppingCart, FileText, CheckCircle, Printer } from 'lucide-react';
import { Sale, SaleProductItem, Customer, CatalogProduct, SaleChannel, PaymentMethod, ShippingMethod, ShippingStatus, InvoiceType } from '../types';
import { formatCurrency, parseDateToISO, validateRequiredSaleFields, generateSaleId } from '../utils/formatters';
import { ProductSearchPicker } from './ProductSearchPicker';

interface SaleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Sale) => void;
  existingSale?: Sale | null;
  existingSaleIds?: string[];
  customers: Customer[];
  catalog: CatalogProduct[];
  canales?: string[];
  metodosPago?: string[];
  metodosEnvio?: string[];
  estadosEnvio?: string[];
  onPrintRemito?: (sale: Sale) => void;
}

export const SaleFormModal: React.FC<SaleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSale,
  existingSaleIds = [],
  customers,
  catalog,
  canales = ['Local', 'MercadoLibre', 'WooCommerce', 'WhatsApp', 'Instagram', 'Venta Telefónica', 'Otro'],
  metodosPago = ['Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'MercadoPago', 'Efectivo contra entrega', 'Cheque / eCheq', 'Otro'],
  metodosEnvio = ['Retiro en Local', 'Correo Argentino', 'Andreani', 'OCA', 'Cadetería / Moto', 'Mercado Envíos', 'Otro'],
  estadosEnvio = ['Pendiente', 'Enviado', 'Entregado', 'No Requiere'],
  onPrintRemito
}) => {
  if (!isOpen) return null;

  // Form states
  const [fecha, setFecha] = useState(existingSale ? existingSale.fecha : new Date().toISOString().split('T')[0]);
  const [clienteId, setClienteId] = useState(existingSale ? existingSale.clienteId : '');
  const [clienteNombre, setClienteNombre] = useState(existingSale ? existingSale.clienteNombre : '');
  const [clienteApellido, setClienteApellido] = useState(existingSale ? existingSale.clienteApellido || '' : '');
  const [clienteDniCuit, setClienteDniCuit] = useState(existingSale ? existingSale.clienteDniCuit || '' : '');
  const [clienteTelefono, setClienteTelefono] = useState(existingSale ? existingSale.clienteTelefono || '' : '');

  const [productos, setProductos] = useState<SaleProductItem[]>(
    existingSale && existingSale.productos.length > 0
      ? existingSale.productos.map(p => ({ ...p, descuento: p.descuento ?? 0 }))
      : [{ id: '1', nombre: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 }]
  );

  const [tipoFactura, setTipoFactura] = useState<InvoiceType>(existingSale?.tipoFactura || 'Factura B');
  const [numeroFactura, setNumeroFactura] = useState(existingSale?.numeroFactura || `FC-B-0002-0000${Math.floor(4500 + Math.random() * 500)}`);
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>(existingSale?.metodoPago || 'Efectivo');
  const [canal, setCanal] = useState<SaleChannel>(existingSale?.canal || 'Local');
  const [metodoEnvio, setMetodoEnvio] = useState<ShippingMethod>(existingSale?.metodoEnvio || 'Retiro en Local');
  const [numeroSeguimiento, setNumeroSeguimiento] = useState(existingSale?.numeroSeguimiento || '');
  const [estadoEnvio, setEstadoEnvio] = useState<ShippingStatus>(existingSale?.estadoEnvio || 'Entregado');
  const [notas, setNotas] = useState(existingSale?.notas || '');

  // Search autocomplete helpers
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Auto-fill customer if selected from directory
  const handleSelectCustomer = (c: Customer) => {
    setClienteId(c.clienteId);
    setClienteNombre(c.nombre);
    setClienteApellido(c.apellido);
    setClienteDniCuit(c.dniCuit || '');
    setClienteTelefono(c.telefono || '');
    setShowCustomerDropdown(false);
  };

  // Product line updates
  const handleProductChange = (index: number, field: keyof SaleProductItem, value: any) => {
    const updated = [...productos];
    const current = { ...updated[index], [field]: value };

    if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuento') {
      const qty = field === 'cantidad' ? parseFloat(value) || 0 : current.cantidad;
      const price = field === 'precioUnitario' ? parseFloat(value) || 0 : current.precioUnitario;
      const desc = field === 'descuento' ? parseFloat(value) || 0 : (current.descuento || 0);
      current.subtotal = qty * price * (1 - desc / 100);
    }

    updated[index] = current;
    setProductos(updated);
  };

  const handleSelectCatalogProduct = (index: number, catProd: CatalogProduct) => {
    const updated = [...productos];
    const desc = updated[index].descuento || 0;
    updated[index] = {
      ...updated[index],
      id: catProd.id,
      nombre: catProd.nombre,
      sku: catProd.sku,
      precioUnitario: catProd.precio,
      subtotal: updated[index].cantidad * catProd.precio * (1 - desc / 100),
      imagenUrl: catProd.imagenUrl
    };
    setProductos(updated);
  };

  const handleAddProductLine = () => {
    setProductos([
      ...productos,
      { id: String(Date.now()), nombre: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 }
    ]);
  };

  const handleRemoveProductLine = (index: number) => {
    if (productos.length === 1) return;
    setProductos(productos.filter((_, i) => i !== index));
  };

  // Calculated total amount
  const montoTotalCalculado = productos.reduce((sum, p) => sum + (p.subtotal || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto generate internal client ID if empty
    const finalClienteId = clienteId.trim() || `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

    const candidateSale: Sale = {
      id: existingSale ? existingSale.id : generateSaleId(existingSaleIds),
      fecha,
      clienteId: finalClienteId,
      clienteNombre: clienteNombre.trim() || 'Cliente Sin Nombre',
      clienteApellido,
      clienteDniCuit,
      clienteTelefono,
      productos: productos.filter(p => p.nombre.trim() !== ''),
      montoTotal: montoTotalCalculado,
      tipoFactura,
      numeroFactura,
      metodoPago,
      canal,
      metodoEnvio,
      numeroSeguimiento,
      estadoEnvio,
      notas,
      creadoEn: existingSale ? existingSale.creadoEn : new Date().toISOString()
    };

    // Requisito obligatorio: fecha, ncli, producto, precio, met. pago
    const valResult = validateRequiredSaleFields(candidateSale);
    if (!valResult.isValid) {
      alert(`⚠️ Faltan requisitos obligatorios para registrar la venta:\n\n• ${valResult.missingFields.join('\n• ')}\n\nPor favor, completa los campos requeridos antes de guardar.`);
      return;
    }

    onSave(candidateSale);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {existingSale ? 'Editar Venta Registrada' : 'Registrar Nueva Venta'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Carga de venta manual para planilla general y sincronización
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Section 1: Data & Client */}
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
                    <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
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
              <div className="relative">
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Buscar Cliente Existente</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
                </div>

                {showCustomerDropdown && customerSearch.trim() !== '' && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-20 max-h-40 overflow-y-auto">
                    {customers
                      .filter((c) =>
                        `${c.nombre} ${c.apellido} ${c.clienteId} ${c.dniCuit}`
                          .toLowerCase()
                          .includes(customerSearch.toLowerCase())
                      )
                      .map((c) => (
                        <div
                          key={c.clienteId}
                          onClick={() => handleSelectCustomer(c)}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{c.nombre} {c.apellido}</span>
                            <span className="ml-2 font-mono text-blue-600 dark:text-blue-400 text-[10px]">{c.clienteId}</span>
                          </div>
                          <span className="text-slate-400 text-[10px]">{c.dniCuit}</span>
                        </div>
                      ))}
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
          </div>

          {/* Section 2: Products Lines */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Detalle de Productos Vendidos
              </span>
              <button
                type="button"
                onClick={handleAddProductLine}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Producto</span>
              </button>
            </div>

            <div className="space-y-2">
              {productos.map((prod, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  
                  {/* Búsqueda Sensitiva de Producto con Imagen */}
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Producto (Búsqueda sensible con imagen)</label>
                    <ProductSearchPicker
                      catalog={catalog}
                      value={prod.nombre}
                      onChangeText={(text) => handleProductChange(idx, 'nombre', text)}
                      onSelectProduct={(catProd) => handleSelectCatalogProduct(idx, catProd)}
                      selectedImageUrl={prod.imagenUrl}
                      placeholder="Buscar producto por nombre, SKU o categoría..."
                    />
                  </div>

                  {/* Cantidad (reducido al 50%) */}
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-center">Cant.</label>
                    <input
                      type="number"
                      min="1"
                      value={prod.cantidad}
                      onChange={(e) => handleProductChange(idx, 'cantidad', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-1 py-1 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Precio Unitario */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-right">Precio Unit. ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={prod.precioUnitario}
                      onChange={(e) => handleProductChange(idx, 'precioUnitario', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-right focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Descuento (%) */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-center">Desc. (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={prod.descuento ?? 0}
                      onChange={(e) => handleProductChange(idx, 'descuento', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Subtotal & Delete */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-between gap-1 pl-1">
                    <div>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Subtotal</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(prod.subtotal)}
                      </span>
                    </div>

                    {productos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProductLine(idx)}
                        className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer"
                        title="Eliminar fila de producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 text-xs mr-2">Monto Total de la Venta:</span>
                <span className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(montoTotalCalculado)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Billing & Logistics */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Facturación, Cobro y Envíos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Tipo Factura */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Tipo de Comprobante</label>
                <select
                  value={tipoFactura}
                  onChange={(e) => setTipoFactura(e.target.value as InvoiceType)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-xs"
                >
                  <option value="Factura B" className="dark:bg-slate-900">Factura B (Consumidor Final)</option>
                  <option value="Factura A" className="dark:bg-slate-900">Factura A (Responsable Inscripto)</option>
                  <option value="Factura C" className="dark:bg-slate-900">Factura C (Monotributo)</option>
                  <option value="Ticket" className="dark:bg-slate-900">Ticket de Caja</option>
                  <option value="Sin Factura" className="dark:bg-slate-900">Sin Factura / Remito</option>
                </select>
              </div>

              {/* Nº Factura */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº Factura Emitida</label>
                <input
                  type="text"
                  placeholder="FC-B-0002-00001234"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Método de Pago *</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
                >
                  {metodosPago.map((m) => (
                    <option key={m} value={m} className="dark:bg-slate-900">{m}</option>
                  ))}
                </select>
              </div>

              {/* Método de Envío */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Método de Envío</label>
                <select
                  value={metodoEnvio}
                  onChange={(e) => setMetodoEnvio(e.target.value as ShippingMethod)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-xs"
                >
                  {metodosEnvio.map((m) => (
                    <option key={m} value={m} className="dark:bg-slate-900">{m}</option>
                  ))}
                </select>
              </div>

              {/* Nº Seguimiento */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Nº Seguimiento / Guía</label>
                <input
                  type="text"
                  placeholder="Ej: 390001294102"
                  value={numeroSeguimiento}
                  onChange={(e) => setNumeroSeguimiento(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              {/* Estado de Envío */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Estado del Envío</label>
                <select
                  value={estadoEnvio}
                  onChange={(e) => setEstadoEnvio(e.target.value as ShippingStatus)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-xs"
                >
                  {estadosEnvio.map((status) => (
                    <option key={status} value={status} className="dark:bg-slate-900">{status}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Observaciones / Notas Internas</label>
              <textarea
                rows={2}
                placeholder="Aclaraciones sobre la venta, cliente o retiro..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              {existingSale && onPrintRemito && (
                <button
                  type="button"
                  onClick={() => onPrintRemito(existingSale)}
                  className="bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-medium px-3.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span>Imprimir Remito</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{existingSale ? 'Guardar Cambios' : 'Registrar Venta'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
