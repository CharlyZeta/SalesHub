import React, { useState, useEffect, useRef } from 'react';
import { X, ShoppingCart, CheckCircle, Printer, Navigation, AlertCircle } from 'lucide-react';
import {
  Sale,
  SaleProductItem,
  Customer,
  CatalogProduct,
  SaleChannel,
  PaymentMethod,
  ShippingMethod,
  ShippingStatus,
  InvoiceType
} from '../types';
import {
  validateRequiredSaleFields,
  generateSaleId,
  normalizePersonName,
  DEFAULT_PROVINCE,
  parseCustomerIdentityFromWoo,
  parseCombinedAddress
} from '../utils/formatters';
import { SaleLocationMap } from './SaleLocationMap';
import { addSystemLog } from '../utils/logger';
import { SaleCustomerSection } from './sales/SaleCustomerSection';
import { SaleProductsSection } from './sales/SaleProductsSection';
import { SaleBillingSection } from './sales/SaleBillingSection';

/** Clave del borrador autoguardado de la venta en curso (sobrevive recargas). */
const SALE_DRAFT_KEY = 'app_sale_draft_v1';

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
  googleMapsApiKey?: string;
}

export const SaleFormModal: React.FC<SaleFormModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <SaleFormModalInner {...props} />;
};

const SaleFormModalInner: React.FC<SaleFormModalProps> = ({
  onClose,
  onSave,
  existingSale,
  existingSaleIds = [],
  customers,
  catalog,
  canales = ['Local', 'MercadoLibre', 'WooCommerce', 'WhatsApp', 'Instagram', 'Venta Telefónica', 'Otro'],
  metodosPago = ['Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'MercadoPago', 'Efectivo contra entrega', 'Cheque / eCheq', 'Otro'],
  metodosEnvio = ['Retiro en Local', 'Correo Argentino', 'Andreani', 'OCA', 'Cadetería / Moto', 'Mercado Envíos', 'Otro'],
  estadosEnvio = ['Pendiente', 'Pendiente de ingreso', 'En camino', 'Listo para retirar', 'Entregado', 'No entregado', 'Enviado', 'No Requiere'],
  onPrintRemito,
  googleMapsApiKey,
}) => {
  // Form states
  const [fecha, setFecha] = useState(existingSale ? existingSale.fecha : new Date().toISOString().split('T')[0]);
  const [clienteId, setClienteId] = useState(existingSale ? existingSale.clienteId : '');
  const [clienteNombre, setClienteNombre] = useState(existingSale ? existingSale.clienteNombre : '');
  const [clienteApellido, setClienteApellido] = useState(existingSale ? existingSale.clienteApellido || '' : '');
  const [clienteDniCuit, setClienteDniCuit] = useState(existingSale ? existingSale.clienteDniCuit || '' : '');
  const [clienteTelefono, setClienteTelefono] = useState(existingSale ? existingSale.clienteTelefono || '' : '');
  const [clienteDireccion, setClienteDireccion] = useState(existingSale?.clienteDireccion || '');
  const [clienteLocalidad, setClienteLocalidad] = useState(existingSale?.clienteLocalidad || '');
  const [clienteCodigoPostal, setClienteCodigoPostal] = useState(existingSale?.clienteCodigoPostal || '');
  const [clienteProvincia, setClienteProvincia] = useState(existingSale?.clienteProvincia || DEFAULT_PROVINCE);

  const [productos, setProductos] = useState<SaleProductItem[]>(
    existingSale && existingSale.productos.length > 0
      ? existingSale.productos.map((p) => ({ ...p, descuento: p.descuento ?? 0 }))
      : [{ id: '1', nombre: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 }]
  );

  const [tipoFactura, setTipoFactura] = useState<InvoiceType>(existingSale?.tipoFactura || 'Factura B');
  const [numeroFactura, setNumeroFactura] = useState(() => {
    if (existingSale) return existingSale.numeroFactura;
    return `B-0003-0000${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>(existingSale?.metodoPago || 'Efectivo');
  const [canal, setCanal] = useState<SaleChannel>(existingSale?.canal || 'Local');
  const [metodoEnvio, setMetodoEnvio] = useState<ShippingMethod>(existingSale?.metodoEnvio || 'Retiro en Local');
  const [numeroSeguimiento, setNumeroSeguimiento] = useState(existingSale?.numeroSeguimiento || '');
  const [estadoEnvio, setEstadoEnvio] = useState<ShippingStatus>(existingSale?.estadoEnvio || 'Entregado');
  const [notas, setNotas] = useState(existingSale?.notas || '');

  const [envioDomicilioDiferente, setEnvioDomicilioDiferente] = useState(existingSale?.envioDomicilioDiferente || false);
  const [entregaDireccion, setEntregaDireccion] = useState(existingSale?.entregaDireccion || '');
  const [entregaLocalidad, setEntregaLocalidad] = useState(existingSale?.entregaLocalidad || '');
  const [entregaCodigoPostal, setEntregaCodigoPostal] = useState(existingSale?.entregaCodigoPostal || '');
  const [entregaProvincia, setEntregaProvincia] = useState(existingSale?.entregaProvincia || DEFAULT_PROVINCE);
  const [entregaCoordenadas, setEntregaCoordenadas] = useState<{ lat: number; lng: number } | undefined>(
    existingSale?.entregaCoordenadas
  );
  const [showMap, setShowMap] = useState(false);

  // Search autocomplete helpers
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);

  // Borrador autoguardado
  const draftEditingId = existingSale?.id ?? null;
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const draftDisabledRef = useRef(false);

  const clearSaleDraft = () => {
    try {
      localStorage.removeItem(SALE_DRAFT_KEY);
    } catch (_e) {
      // localStorage no disponible
    }
  };

  // Restaurar el borrador al abrir el modal
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SALE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { editingId?: string | null; savedAt?: string; data?: Record<string, any> };
      if ((draft?.editingId ?? null) !== draftEditingId || !draft?.data) {
        clearSaleDraft();
        return;
      }
      const d = draft.data;
      if (d.fecha !== undefined) setFecha(d.fecha);
      if (d.clienteId !== undefined) setClienteId(d.clienteId);
      if (d.clienteNombre !== undefined) setClienteNombre(d.clienteNombre);
      if (d.clienteApellido !== undefined) setClienteApellido(d.clienteApellido);
      if (d.clienteDniCuit !== undefined) setClienteDniCuit(d.clienteDniCuit);
      if (d.clienteTelefono !== undefined) setClienteTelefono(d.clienteTelefono);
      if (d.clienteDireccion !== undefined) setClienteDireccion(d.clienteDireccion);
      if (d.clienteLocalidad !== undefined) setClienteLocalidad(d.clienteLocalidad);
      if (d.clienteCodigoPostal !== undefined) setClienteCodigoPostal(d.clienteCodigoPostal);
      if (d.clienteProvincia !== undefined) setClienteProvincia(d.clienteProvincia);
      if (Array.isArray(d.productos) && d.productos.length > 0) setProductos(d.productos);
      if (d.tipoFactura !== undefined) setTipoFactura(d.tipoFactura);
      if (d.numeroFactura !== undefined) setNumeroFactura(d.numeroFactura);
      if (d.metodoPago !== undefined) setMetodoPago(d.metodoPago);
      if (d.canal !== undefined) setCanal(d.canal);
      if (d.metodoEnvio !== undefined) setMetodoEnvio(d.metodoEnvio);
      if (d.numeroSeguimiento !== undefined) setNumeroSeguimiento(d.numeroSeguimiento);
      if (d.estadoEnvio !== undefined) setEstadoEnvio(d.estadoEnvio);
      if (d.notas !== undefined) setNotas(d.notas);
      if (d.envioDomicilioDiferente !== undefined) setEnvioDomicilioDiferente(d.envioDomicilioDiferente);
      if (d.entregaDireccion !== undefined) setEntregaDireccion(d.entregaDireccion);
      if (d.entregaLocalidad !== undefined) setEntregaLocalidad(d.entregaLocalidad);
      if (d.entregaCodigoPostal !== undefined) setEntregaCodigoPostal(d.entregaCodigoPostal);
      if (d.entregaProvincia !== undefined) setEntregaProvincia(d.entregaProvincia);
      if (d.entregaCoordenadas !== undefined) setEntregaCoordenadas(d.entregaCoordenadas);
      setDraftRestoredAt(draft.savedAt || new Date().toISOString());
      addSystemLog('INFO', 'Ventas', 'Se recuperó un borrador de venta sin guardar tras una recarga de la aplicación');
    } catch (_e) {
      clearSaleDraft();
    }
  }, [draftEditingId]);

  // Autoguardado con debounce
  useEffect(() => {
    if (draftDisabledRef.current) return;
    const hasContent = Boolean(
      clienteNombre.trim() || clienteDniCuit.trim() || productos.some((p) => p.nombre.trim() !== '')
    );
    if (!hasContent) return;

    const timer = setTimeout(() => {
      try {
        const data = {
          fecha,
          clienteId,
          clienteNombre,
          clienteApellido,
          clienteDniCuit,
          clienteTelefono,
          clienteDireccion,
          clienteLocalidad,
          clienteCodigoPostal,
          clienteProvincia,
          productos,
          tipoFactura,
          numeroFactura,
          metodoPago,
          canal,
          metodoEnvio,
          numeroSeguimiento,
          estadoEnvio,
          notas,
          envioDomicilioDiferente,
          entregaDireccion,
          entregaLocalidad,
          entregaCodigoPostal,
          entregaProvincia,
          entregaCoordenadas
        };
        localStorage.setItem(
          SALE_DRAFT_KEY,
          JSON.stringify({ editingId: draftEditingId, savedAt: new Date().toISOString(), data })
        );
      } catch (_e) {
        // sin persistencia disponible
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    fecha,
    clienteId,
    clienteNombre,
    clienteApellido,
    clienteDniCuit,
    clienteTelefono,
    clienteDireccion,
    clienteLocalidad,
    clienteCodigoPostal,
    clienteProvincia,
    productos,
    tipoFactura,
    numeroFactura,
    metodoPago,
    canal,
    metodoEnvio,
    numeroSeguimiento,
    estadoEnvio,
    notas,
    envioDomicilioDiferente,
    entregaDireccion,
    entregaLocalidad,
    entregaCodigoPostal,
    entregaProvincia,
    entregaCoordenadas,
    draftEditingId
  ]);

  // Aviso del navegador si recargan con la venta a medio cargar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!localStorage.getItem(SALE_DRAFT_KEY)) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleDiscardDraft = () => {
    draftDisabledRef.current = true;
    clearSaleDraft();
    setDraftRestoredAt(null);
  };

  const handleCancelSale = () => {
    draftDisabledRef.current = true;
    clearSaleDraft();
    onClose();
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Auto-fill customer if selected from directory
  const handleSelectCustomer = (c: Customer) => {
    const identity = parseCustomerIdentityFromWoo(c.nombre, c.apellido, c.clienteId);
    const address = parseCombinedAddress(c.direccion, c.localidad, c.provincia);

    setClienteId(identity.clienteId);
    setClienteNombre(identity.nombre);
    setClienteApellido(identity.apellido);
    setClienteDniCuit(c.dniCuit || '');
    setClienteTelefono(c.telefono || '');
    setClienteDireccion(address.direccion);
    setClienteLocalidad(address.localidad);
    setClienteCodigoPostal(c.codigoPostal || '');
    setClienteProvincia(address.provincia || DEFAULT_PROVINCE);
    setCustomerSearch(`${identity.nombre} ${identity.apellido}`.trim());
    setShowCustomerDropdown(false);
  };

  // Product line updates
  const handleProductChange = (index: number, field: keyof SaleProductItem, value: any) => {
    const updated = [...productos];
    const current = { ...updated[index], [field]: value };

    if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuento') {
      const qty = field === 'cantidad' ? parseFloat(value) || 0 : current.cantidad;
      const price = field === 'precioUnitario' ? parseFloat(value) || 0 : current.precioUnitario;
      const desc = field === 'descuento' ? parseFloat(value) || 0 : current.descuento || 0;
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

  const generateDefaultInvoiceNumber = (type: InvoiceType) => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const rand3 = Math.floor(100 + Math.random() * 900);
    switch (type) {
      case 'Factura A':
        return `A-0003-00000${rand3}`;
      case 'Factura B':
        return `B-0003-0000${rand}`;
      case 'Factura C':
        return `C-0003-0000${rand}`;
      case 'Ticket':
        return `T-0003-0000${rand}`;
      case 'Sin Factura':
      default:
        return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const finalClienteId = clienteId.trim() || `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

      const candidateSale: Sale = {
        id: existingSale ? existingSale.id : generateSaleId(existingSaleIds),
        fecha,
        clienteId: finalClienteId,
        clienteNombre: normalizePersonName(clienteNombre) || 'Cliente Sin Nombre',
        clienteApellido: normalizePersonName(clienteApellido),
        clienteDniCuit: clienteDniCuit.trim(),
        clienteTelefono: clienteTelefono.trim(),
        clienteDireccion: clienteDireccion.trim(),
        clienteLocalidad: clienteLocalidad.trim(),
        clienteCodigoPostal: clienteCodigoPostal.trim(),
        clienteProvincia: clienteProvincia.trim() || DEFAULT_PROVINCE,
        productos: productos.filter((p) => p.nombre.trim() !== ''),
        montoTotal: montoTotalCalculado,
        tipoFactura,
        numeroFactura,
        metodoPago,
        canal,
        metodoEnvio,
        numeroSeguimiento,
        estadoEnvio,
        envioDomicilioDiferente,
        entregaDireccion: envioDomicilioDiferente ? entregaDireccion.trim() : '',
        entregaLocalidad: envioDomicilioDiferente ? entregaLocalidad.trim() : '',
        entregaCodigoPostal: envioDomicilioDiferente ? entregaCodigoPostal.trim() : '',
        entregaProvincia: envioDomicilioDiferente ? entregaProvincia.trim() || DEFAULT_PROVINCE : '',
        entregaCoordenadas: envioDomicilioDiferente ? entregaCoordenadas : undefined,
        notas,
        creadoEn: existingSale ? existingSale.creadoEn : new Date().toISOString()
      };

      const valResult = validateRequiredSaleFields(candidateSale);
      if (!valResult.isValid) {
        addSystemLog('WARN', 'Ventas', `Intento de guardar venta incompleta. Faltan: ${valResult.missingFields.join(', ')}`);
        alert(`⚠️ Faltan requisitos obligatorios para registrar la venta:\n\n• ${valResult.missingFields.join('\n• ')}\n\nPor favor, completa los campos requeridos antes de guardar.`);
        return;
      }

      draftDisabledRef.current = true;
      clearSaleDraft();
      onSave(candidateSale);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar la venta:', err);
      addSystemLog('ERROR', 'Ventas', `Fallo al procesar el guardado de la venta: ${err?.message || err}`);
      alert('Ocurrió un error al guardar la venta. Por favor, revisa la consola o el registro del sistema.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] transition-all duration-300 ${
          showMap ? 'max-w-7xl' : 'max-w-4xl'
        }`}
      >
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 font-bold cursor-pointer text-xs"
            >
              <span>{showMap ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
              <Navigation className={`w-3.5 h-3.5 transform transition-transform ${showMap ? 'rotate-90' : ''}`} />
            </button>
            <button
              onClick={handleCancelSale}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col text-xs text-slate-800 dark:text-slate-200 min-h-0">
          <div className="flex-1 overflow-y-auto flex">
            {/* Formulario (Left panel) */}
            <div className={`p-5 space-y-4 flex-1 ${showMap ? 'max-w-[65%]' : 'w-full'}`}>
              {draftRestoredAt && (
                <div className="flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] leading-relaxed">
                      <strong>Borrador recuperado.</strong> Se restauró una venta sin guardar del{' '}
                      {new Date(draftRestoredAt).toLocaleString()}. Guardá la venta para conservarla o descartá el borrador.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="shrink-0 text-[11px] font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded px-2 py-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                  >
                    Descartar borrador
                  </button>
                </div>
              )}

              {/* Section 1: Customer */}
              <SaleCustomerSection
                fecha={fecha}
                setFecha={setFecha}
                canal={canal}
                setCanal={setCanal}
                canales={canales}
                clienteId={clienteId}
                setClienteId={setClienteId}
                clienteNombre={clienteNombre}
                setClienteNombre={setClienteNombre}
                clienteApellido={clienteApellido}
                setClienteApellido={setClienteApellido}
                clienteDniCuit={clienteDniCuit}
                setClienteDniCuit={setClienteDniCuit}
                clienteTelefono={clienteTelefono}
                setClienteTelefono={setClienteTelefono}
                clienteDireccion={clienteDireccion}
                setClienteDireccion={setClienteDireccion}
                clienteLocalidad={clienteLocalidad}
                setClienteLocalidad={setClienteLocalidad}
                clienteCodigoPostal={clienteCodigoPostal}
                setClienteCodigoPostal={setClienteCodigoPostal}
                clienteProvincia={clienteProvincia}
                setClienteProvincia={setClienteProvincia}
                envioDomicilioDiferente={envioDomicilioDiferente}
                setEnvioDomicilioDiferente={setEnvioDomicilioDiferente}
                entregaDireccion={entregaDireccion}
                setEntregaDireccion={setEntregaDireccion}
                entregaLocalidad={entregaLocalidad}
                setEntregaLocalidad={setEntregaLocalidad}
                entregaCodigoPostal={entregaCodigoPostal}
                setEntregaCodigoPostal={setEntregaCodigoPostal}
                entregaProvincia={entregaProvincia}
                setEntregaProvincia={setEntregaProvincia}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                showCustomerDropdown={showCustomerDropdown}
                setShowCustomerDropdown={setShowCustomerDropdown}
                isCustomerSearchLoading={isCustomerSearchLoading}
                setIsCustomerSearchLoading={setIsCustomerSearchLoading}
                customers={customers}
                handleSelectCustomer={handleSelectCustomer}
              />

              {/* Section 2: Products */}
              <SaleProductsSection
                productos={productos}
                catalog={catalog}
                handleAddProductLine={handleAddProductLine}
                handleRemoveProductLine={handleRemoveProductLine}
                handleProductChange={handleProductChange}
                handleSelectCatalogProduct={handleSelectCatalogProduct}
                montoTotalCalculado={montoTotalCalculado}
              />

              {/* Section 3: Billing */}
              <SaleBillingSection
                tipoFactura={tipoFactura}
                setTipoFactura={setTipoFactura}
                numeroFactura={numeroFactura}
                setNumeroFactura={setNumeroFactura}
                metodoPago={metodoPago}
                setMetodoPago={setMetodoPago}
                metodosPago={metodosPago}
                metodoEnvio={metodoEnvio}
                setMetodoEnvio={setMetodoEnvio}
                metodosEnvio={metodosEnvio}
                numeroSeguimiento={numeroSeguimiento}
                setNumeroSeguimiento={setNumeroSeguimiento}
                estadoEnvio={estadoEnvio}
                setEstadoEnvio={setEstadoEnvio}
                estadosEnvio={estadosEnvio}
                notas={notas}
                setNotas={setNotas}
                generateDefaultInvoiceNumber={generateDefaultInvoiceNumber}
              />
            </div>

            {/* Mapa (Right panel) */}
            {showMap && (
              <div className="w-[35%] min-w-[320px] flex flex-col">
                <SaleLocationMap
                  address={envioDomicilioDiferente ? entregaDireccion : clienteDireccion}
                  city={envioDomicilioDiferente ? entregaLocalidad : clienteLocalidad}
                  province={envioDomicilioDiferente ? entregaProvincia : clienteProvincia}
                  coordinates={entregaCoordenadas}
                  onChangeCoordinates={setEntregaCoordenadas}
                  clientName={`${clienteNombre} ${clienteApellido}`.trim()}
                  clientPhone={clienteTelefono}
                  productsText={productos
                    .filter((p) => p.nombre.trim() !== '')
                    .map((p) => `${p.nombre} (x${p.cantidad})`)
                    .join(', ')}
                  googleMapsApiKey={googleMapsApiKey}
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
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
                onClick={handleCancelSale}
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
