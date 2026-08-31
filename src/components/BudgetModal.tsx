import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Search, 
  UserCheck, 
  UserPlus, 
  DollarSign, 
  Calendar, 
  ArrowRight,
  Eye,
  List,
  Sparkles,
  Building,
  RefreshCw,
  MessageSquare,
  Mail,
  Send,
  Download,
  FileDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Budget, BudgetItem, Customer, CatalogProduct, Sale, AppConfig } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ProductSearchPicker } from './ProductSearchPicker';
import { numberToWordsSpanish } from '../utils/numberToWords';
import { SendBudgetModal } from './SendBudgetModal';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  customers: Customer[];
  catalog: CatalogProduct[];
  config: AppConfig;
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => void;
  onConvertToSale: (budget: Budget) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  budgets,
  customers,
  catalog,
  config,
  onSaveBudget,
  onDeleteBudget,
  onConvertToSale
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'preview'>('create');
  
  const empresa = config?.empresa || {
    nombre: 'DUAL S.R.L.',
    subtitulo: 'Para Comercio y Hogar',
    logoUrl: '',
    mostrarLogo: false,
    domicilio: 'ESTANISLAO ZEBALLOS 3825, SANTA FE.',
    telefono: '0342-4883135',
    email: 'dualdesantafe@hotmail.com',
    cuit: '30710642857',
    iibb: '0111353853',
    condicionIva: 'I.V.A. Responsable Inscripto',
    inicioActividades: '01/07/2008'
  };

  // Currently active budget for viewing / editing / previewing
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Form State
  const [fechaEmision, setFechaEmision] = useState<string>(new Date().toISOString().split('T')[0]);
  const [esClienteAgendado, setEsClienteAgendado] = useState<boolean>(false);
  const [selectedCustomerSearch, setSelectedCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);

  // Customer fields
  const [clienteId, setClienteId] = useState('');
  const [razonSocialNombre, setRazonSocialNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dniCuit, setDniCuit] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [condicionFiscal, setCondicionFiscal] = useState('CONSUMIDOR FINAL');
  const [condicionVenta, setCondicionVenta] = useState('CONTADO');

  // Send Budget Modal state
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendModalBudget, setSendModalBudget] = useState<Budget | null>(null);
  const [sendModalChannel, setSendModalChannel] = useState<'whatsapp' | 'email'>('whatsapp');

  // Convert to Sale Modal state
  const [budgetToConvert, setBudgetToConvert] = useState<Budget | null>(null);

  // Status feedback and PDF loading states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleOpenSendModal = (budget: Budget, channel: 'whatsapp' | 'email') => {
    setSendModalBudget(budget);
    setSendModalChannel(channel);
    setSendModalOpen(true);
  };

  // Items State
  const [items, setItems] = useState<BudgetItem[]>([
    { id: '1', descripcion: '', cantidad: 1, precioUnitario: 0, descuentoPorcentaje: 0, subtotal: 0 }
  ]);

  const [percepciones, setPercepciones] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCustomerDropdown(false);
      }
    };
    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showCustomerDropdown]);

  if (!isOpen) return null;

  // Initialize or reset form for new budget
  const handleNewBudget = () => {
    setSelectedBudget(null);
    setFechaEmision(new Date().toISOString().split('T')[0]);
    setEsClienteAgendado(false);
    setSelectedCustomerSearch('');
    setClienteId('');
    setRazonSocialNombre('');
    setApellido('');
    setDniCuit('');
    setDomicilio('');
    setTelefono('');
    setEmail('');
    setCodigoPostal('');
    setCondicionFiscal('CONSUMIDOR FINAL');
    setCondicionVenta('CONTADO');
    setItems([
      { id: '1', descripcion: '', cantidad: 1, precioUnitario: 0, descuentoPorcentaje: 0, subtotal: 0 }
    ]);
    setPercepciones(0);
    setObservaciones('');
    setActiveTab('create');
  };

  // Populate form for editing existing budget
  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setFechaEmision(budget.fechaEmision);
    setEsClienteAgendado(budget.esClienteAgendado);
    setClienteId(budget.clienteId || '');
    setRazonSocialNombre(budget.razonSocialNombre);
    setApellido(budget.apellido || '');
    setDniCuit(budget.dniCuit);
    setDomicilio(budget.domicilio);
    setTelefono(budget.telefono);
    setEmail(budget.email || '');
    setCodigoPostal(budget.codigoPostal);
    setCondicionFiscal(budget.condicionFiscal);
    setCondicionVenta(budget.condicionVenta);
    setItems(budget.items);
    setPercepciones(budget.percepciones);
    setObservaciones(budget.observaciones || '');
    setActiveTab('create');
  };

  // View PDF Preview
  const handlePreviewBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setActiveTab('preview');
  };

  // Select customer from directory
  const handleSelectCustomer = (cust: Customer) => {
    setClienteId(cust.clienteId);
    setRazonSocialNombre(`${cust.nombre} ${cust.apellido}`.trim());
    setApellido(cust.apellido || '');
    setDniCuit(cust.dniCuit || '');
    setDomicilio(cust.direccion || '');
    setTelefono(cust.telefono || '');
    setEmail(cust.email || '');
    setCodigoPostal(cust.codigoPostal || '');
    setSelectedCustomerSearch(`${cust.nombre} ${cust.apellido}`);
    setShowCustomerDropdown(false);
  };

  // Item row operations
  const handleAddItemRow = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), descripcion: '', cantidad: 1, precioUnitario: 0, descuentoPorcentaje: 0, subtotal: 0 }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof BudgetItem, value: any) => {
    const updated = [...items];
    const currentItem = { ...updated[index] };

    if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuentoPorcentaje') {
      const parsedNum = value === '' ? 0 : Number(value);
      const safeNum = isNaN(parsedNum) ? 0 : parsedNum;
      (currentItem as any)[field] = safeNum;

      const cant = Number(currentItem.cantidad) || 0;
      const pu = Number(currentItem.precioUnitario) || 0;
      const desc = Number(currentItem.descuentoPorcentaje) || 0;
      const baseSubtotal = cant * pu;
      currentItem.subtotal = baseSubtotal - (baseSubtotal * (desc / 100));
    } else {
      (currentItem as any)[field] = value;
    }

    updated[index] = currentItem;
    setItems(updated);
  };

  const handleSelectCatalogItem = (index: number, catalogItem: CatalogProduct) => {
    const updated = [...items];
    const cant = Number(updated[index].cantidad) || 1;
    const pu = Number(catalogItem.precio) || 0;
    const desc = Number(updated[index].descuentoPorcentaje) || 0;
    const baseSubtotal = cant * pu;

    updated[index] = {
      ...updated[index],
      descripcion: catalogItem.nombre,
      precioUnitario: pu,
      descuentoPorcentaje: desc,
      subtotal: baseSubtotal - (baseSubtotal * (desc / 100)),
      imagenUrl: catalogItem.imagenUrl
    };
    setItems(updated);
  };

  // Total Calculations
  const rawSubtotal = items.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.precioUnitario)), 0);
  const descuentoTotal = items.reduce((acc, item) => {
    const base = Number(item.cantidad) * Number(item.precioUnitario);
    return acc + (base * (Number(item.descuentoPorcentaje) / 100));
  }, 0);
  const subtotalNeto = items.reduce((acc, item) => acc + item.subtotal, 0);
  const importeTotalCalculado = subtotalNeto + Number(percepciones || 0);

  // Submit Budget Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!razonSocialNombre.trim()) {
      setFormError('Por favor, ingresa el nombre o Razón Social del cliente.');
      return;
    }

    if (items.some(i => !i.descripcion.trim() || Number(i.cantidad) <= 0)) {
      setFormError('Por favor completa la descripción y cantidad mayor a 0 de todos los productos.');
      return;
    }

    // Sequence calculation
    const pv = config.puntoVentaPresupuesto || '0001';
    const nextSeq = selectedBudget
      ? selectedBudget.comprobanteNumero
      : ((config.ultimoNumeroPresupuesto || 311) + 1).toString().padStart(8, '0');
    
    const numeroPresupuestoStr = `P${pv.padStart(4, '0')}-${nextSeq}`;

    const budgetToSave: Budget = {
      id: selectedBudget ? selectedBudget.id : `PRE-${nextSeq}`,
      numeroPresupuesto: selectedBudget ? selectedBudget.numeroPresupuesto : numeroPresupuestoStr,
      puntoVenta: pv,
      comprobanteNumero: nextSeq,
      fechaEmision,
      esClienteAgendado,
      clienteId: esClienteAgendado ? clienteId : undefined,
      razonSocialNombre,
      apellido,
      dniCuit,
      domicilio,
      telefono,
      email,
      codigoPostal,
      condicionFiscal,
      condicionVenta,
      items,
      subtotal: rawSubtotal,
      descuentoTotal,
      percepciones: Number(percepciones),
      importeTotal: importeTotalCalculado,
      observaciones,
      estado: selectedBudget ? selectedBudget.estado : 'Pendiente',
      creadoEn: selectedBudget ? selectedBudget.creadoEn : new Date().toISOString()
    };

    onSaveBudget(budgetToSave);
    setSelectedBudget(budgetToSave);
    setSuccessMessage(`¡Presupuesto ${budgetToSave.numeroPresupuesto} guardado correctamente!`);
    setActiveTab('preview');
  };

  // Convert to Sale trigger
  const handleConvert = (b: Budget) => {
    setBudgetToConvert(b);
  };

  // Confirm conversion execution
  const handleConfirmConvert = () => {
    if (!budgetToConvert) return;
    const b = budgetToConvert;
    onConvertToSale(b);

    if (selectedBudget?.id === b.id) {
      setSelectedBudget({
        ...selectedBudget,
        estado: 'Convertido'
      });
    }

    setSuccessMessage(`¡Presupuesto ${b.numeroPresupuesto} convertido con éxito en Venta Real! Se ha añadido el comprobante a las ventas registradas.`);
    setBudgetToConvert(null);
  };

  // PDF Generation function (html-to-image + jsPDF directo)
  const handleDownloadPdf = async () => {
    const element = document.getElementById('budget-pdf-content');
    if (!element || !selectedBudget) {
      setFormError('No se encontró el contenido del presupuesto para generar el PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    setSuccessMessage(null);
    setFormError(null);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const numero = selectedBudget.numeroPresupuesto || 'DUAL';
      const clienteRaw = `${selectedBudget.razonSocialNombre || ''} ${selectedBudget.apellido || ''}`.trim() || 'SIN_CLIENTE';
      const cliente = clienteRaw.replace(/\s+/g, '_').replace(/[^\w\-áéíóúÁÉÍÓÚñÑ]/g, '');
      const fecha = (selectedBudget.fechaEmision || new Date().toISOString().split('T')[0]).replace(/-/g, '');
      const filename = `Presupuesto_${numero}_${cliente}_${fecha}.pdf`;

      // Mismo mecanismo que la impresión: clonar la hoja dentro del contenedor
      // #print-area-budget (en el flujo normal del documento, a ancho A4) y
      // capturar ESE nodo con html-to-image, que sí se renderiza.
      let printArea = document.getElementById('print-area-budget');
      if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'print-area-budget';
        document.body.appendChild(printArea);
      }
      printArea.innerHTML = '';
      printArea.appendChild(element.cloneNode(true));

      let dataUrl = '';
      try {
        dataUrl = await toPng(printArea, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          width: 794
        });
      } finally {
        printArea.innerHTML = '';
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      // Ajuste "contener": escala el PNG dentro de la página A4, centrado,
      // con margen de 5mm. Nunca puede desbordar los bordes de la hoja.
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const imgW = Math.max(imgProps.width, 1);
      const imgH = Math.max(imgProps.height, 1);

      let w = maxW;
      let h = (imgH / imgW) * w;
      if (h > maxH) {
        h = maxH;
        w = (imgW / imgH) * h;
      }
      const x = (pageWidth - w) / 2;
      const y = margin;

      pdf.addImage(dataUrl, 'PNG', x, y, w, h);
      pdf.save(filename);
      setSuccessMessage(`¡Documento PDF "${filename}" generado y descargado con éxito!`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      setFormError('No se pudo generar el PDF automáticamente. Usá el botón "Imprimir" y en el diálogo elegí "Guardar como PDF".');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print function: clone the sheet into a dedicated print-only container
  // (hides the app/overlay and avoids fixed/overflow ancestors clipping the sheet)
  const handlePrint = () => {
    const element = document.getElementById('budget-pdf-content');
    if (!element) {
      setFormError('No se encontró el contenido del presupuesto para imprimir.');
      return;
    }
    setFormError(null);

    let printArea = document.getElementById('print-area-budget');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'print-area-budget';
      document.body.appendChild(printArea);
    }
    printArea.innerHTML = '';
    printArea.appendChild(element.cloneNode(true));

    const cleanup = () => {
      document.body.classList.remove('printing-budget');
      window.removeEventListener('afterprint', cleanup);
      const area = document.getElementById('print-area-budget');
      if (area) area.remove();
    };
    document.body.classList.add('printing-budget');
    window.addEventListener('afterprint', cleanup);
    try {
      window.print();
    } catch (err) {
      console.error('Error al abrir el diálogo de impresión:', err);
    } finally {
      setTimeout(cleanup, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header - Screen only */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 dark:bg-slate-800 text-white p-2 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Herramienta de Presupuestos & Cotizaciones
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-mono font-bold border border-blue-200 dark:border-blue-800">
                  Firma {empresa.nombre}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Genera presupuestos oficiales para clientes agendados o eventuales con comprobante secuencial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Screen only */}
        <div className="bg-slate-100/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-2 flex items-center gap-2 print:hidden">
          <button
            onClick={handleNewBudget}
            className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'create' && !selectedBudget
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Presupuesto</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'list'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Historial Presupuestos ({budgets.length})</span>
          </button>

          {selectedBudget && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Ver PDF / Imprimir ({selectedBudget.numeroPresupuesto})</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto text-xs text-slate-800 print:p-0 print:overflow-visible space-y-4">

          {/* Success Notification Banner */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center justify-between text-xs print:hidden shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form Error Banner */}
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between text-xs print:hidden shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-red-600 hover:text-red-900 font-bold ml-2 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {/* TAB 1: Form / Presupuestador */}
          {activeTab === 'create' && (
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
                        !esClienteAgendado ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Cliente Eventual
                    </button>
                    <button
                      type="button"
                      onClick={() => setEsClienteAgendado(true)}
                      className={`px-3 py-1 rounded-sm transition-colors cursor-pointer ${
                        esClienteAgendado ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{c.nombre} {c.apellido}</span>
                                    <span className="ml-2 font-mono text-blue-600 dark:text-blue-400 text-[10px]">{c.clienteId}</span>
                                  </div>
                                  <span className="text-slate-400 dark:text-slate-500 text-[10px]">{c.dniCuit || 'Sin DNI'}</span>
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
                      placeholder="Ej: CONSUMIDOR FINAL o DUAL S.R.L."
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
                      placeholder="30710642857 / 20-30123456-7"
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
                      placeholder="342-4883135"
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Condición Fiscal</label>
                    <select
                      value={condicionFiscal}
                      onChange={(e) => setCondicionFiscal(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-2xs"
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-2xs"
                    >
                      <option value="CONTADO">CONTADO</option>
                      <option value="TRANSFERENCIA BANCARIA">TRANSFERENCIA BANCARIA</option>
                      <option value="TARJETA EN CUOTAS">TARJETA EN CUOTAS</option>
                      <option value="CHEQUE A 30 DÍAS">CHEQUE A 30 DÍAS</option>
                      <option value="CUENTA CORRIENTE">CUENTA CORRIENTE</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Products & Line Items */}
              <div className="bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Detalle de Productos a Presupuestar
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Selecciona de WooCommerce o escribe una descripción y precio manual.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                      title="Agregar una nueva fila de producto"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Agregar Fila</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const isWooItem = Boolean(item.imagenUrl || catalog.some(c => c.nombre.toLowerCase() === item.descripcion.toLowerCase()));

                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                        
                        {/* Description / Catalog Autocomplete con Búsqueda Sensitiva e Imagen */}
                        <div className="col-span-12 sm:col-span-5">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-slate-500 dark:text-slate-400">Descripción del Producto</label>
                            {isWooItem ? (
                              <span className="text-[9px] bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded font-semibold border border-purple-100 dark:border-purple-800">
                                WooCommerce
                              </span>
                            ) : item.descripcion.trim() ? (
                              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold border border-emerald-100 dark:border-emerald-800">
                                Manual / Libre
                              </span>
                            ) : null}
                          </div>
                          <ProductSearchPicker
                            catalog={catalog}
                            value={item.descripcion}
                            onChangeText={(text) => handleItemChange(idx, 'descripcion', text)}
                            onSelectProduct={(catProd) => handleSelectCatalogItem(idx, catProd)}
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

                        {/* Precio Unitario (Libre / Modificable) */}
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
                  );
                })}
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
                      <span>{formatCurrency(rawSubtotal)}</span>
                    </div>
                    {descuentoTotal > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <span>Descuento:</span>
                        <span>- {formatCurrency(descuentoTotal)}</span>
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
                      <span className="text-blue-700 dark:text-blue-400">{formatCurrency(importeTotalCalculado)}</span>
                    </div>
                    <p className="text-[10px] font-sans italic text-slate-500 dark:text-slate-400 text-left pt-1">
                      Son Pesos: {numberToWordsSpanish(importeTotalCalculado)}
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
          )}

          {/* TAB 2: Historial / Lista de Presupuestos */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Presupuestos Generados</h3>
                <button
                  onClick={handleNewBudget}
                  className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Presupuesto</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3">Nº Presupuesto</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Cond. Venta</th>
                      <th className="p-3 text-right">Importe Total</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {budgets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                          No hay presupuestos registrados aún. Haz clic en "Nuevo Presupuesto".
                        </td>
                      </tr>
                    ) : (
                      budgets.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">{b.numeroPresupuesto}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{b.fechaEmision}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{b.razonSocialNombre}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{b.condicionVenta}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(b.importeTotal)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.estado === 'Convertido'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : b.estado === 'Aprobado'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {b.estado}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => handleOpenSendModal(b, 'whatsapp')}
                              className="bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 p-1.5 rounded cursor-pointer transition-colors"
                              title="Enviar por WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenSendModal(b, 'email')}
                              className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 p-1.5 rounded cursor-pointer transition-colors"
                              title="Enviar por Email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePreviewBudget(b)}
                              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-1.5 rounded cursor-pointer"
                              title="Ver / Imprimir PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEditBudget(b)}
                              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-1.5 rounded cursor-pointer"
                              title="Editar"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {b.estado !== 'Convertido' && (
                              <button
                                onClick={() => handleConvert(b)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded cursor-pointer transition-colors"
                                title="Convertir a Venta Real"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteBudget(b.id)}
                              className="bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 p-1.5 rounded cursor-pointer transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Visual Printable PDF Document Preview */}
          {activeTab === 'preview' && selectedBudget && (
            <div className="space-y-4">
              
              {/* Action Toolbar on screen */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg print:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Presupuesto {selectedBudget.numeroPresupuesto}</span>
                  <span className="text-slate-500 dark:text-slate-400">| Cliente: {selectedBudget.razonSocialNombre}</span>
                  {selectedBudget.estado === 'Convertido' && (
                    <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-800">
                      Venta Real Convertida
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSendModal(selectedBudget, 'whatsapp')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSendModal(selectedBudget, 'email')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>

                  {/* Direct PDF Download Button */}
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs transition-colors"
                    title="Generar y descargar archivo PDF oficial directamente a tu equipo"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        <span>Descargar PDF</span>
                      </>
                    )}
                  </button>

                  {/* Print Button */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                    title="Vista de impresión directa del navegador"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Imprimir</span>
                  </button>

                  {/* Convert to Sale Button */}
                  {selectedBudget.estado !== 'Convertido' && (
                    <button
                      type="button"
                      onClick={() => handleConvert(selectedBudget)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Convertir a Venta Real</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PDF Sheet Layout - Exactly matching reference PDF */}
              <div id="budget-pdf-content" className="bg-white text-black p-6 sm:p-8 border border-slate-300 max-w-[800px] mx-auto shadow-md font-sans print:shadow-none print:border-none print:p-0 print:m-0">
                
                {/* Header Outer Container */}
                <div className="border border-black relative mb-2">
                  <div className="grid grid-cols-12 text-xs">
                    
                    {/* Left Column: Firm Details */}
                    <div className="col-span-6 p-3 border-r border-black relative">
                      {empresa.mostrarLogo && empresa.logoUrl ? (
                        <div className="mb-2 border-b border-slate-300 pb-2">
                          <img src={empresa.logoUrl} alt={empresa.nombre} className="max-h-12 object-contain mb-1.5" />
                          {empresa.subtitulo && (
                            <div className="text-[9px] font-bold tracking-widest text-slate-700 uppercase leading-tight">
                              {empresa.subtitulo}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-2 border-b border-slate-300 pb-2">
                          <div className="font-bold text-base mb-1">{empresa.nombre}</div>
                          {empresa.subtitulo && (
                            <div className="text-[9px] font-bold text-slate-700 uppercase">{empresa.subtitulo}</div>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] space-y-0.5">
                        <p><span className="font-semibold">Domicilio :</span> {empresa.domicilio}</p>
                        <p><span className="font-semibold">Tel./Email:</span> {empresa.telefono} / {empresa.email}</p>
                        <p className="mt-1 font-bold">{empresa.condicionIva}</p>
                      </div>
                    </div>

                    {/* Center Box: AFIP Document Type "X" */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-white border-b border-x border-black w-10 h-10 flex items-center justify-center font-bold text-xl z-10">
                      X
                    </div>

                    {/* Right Column: Presupuesto & AFIP data */}
                    <div className="col-span-6 p-3 pl-6 text-[10px] space-y-1">
                      <div className="text-base font-bold text-right mb-2">Presupuesto</div>
                      
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span>Punto de Venta: <strong className="font-mono">{selectedBudget.puntoVenta || '0001'}</strong></span>
                        <span>Comp. Nº: <strong className="font-mono">{selectedBudget.comprobanteNumero}</strong></span>
                      </div>

                      <div className="flex justify-between pt-1">
                        <span className="font-semibold">Fecha de Emisión :</span>
                        <span className="font-mono font-bold">{selectedBudget.fechaEmision.split('-').reverse().join('/')}</span>
                      </div>

                      <div className="pt-2 text-[10px] space-y-0.5">
                        <p><span className="font-semibold">CUIT:</span> {empresa.cuit}</p>
                        <p><span className="font-semibold">Ing. Brutos:</span> {empresa.iibb}</p>
                        <p><span className="font-semibold">Fecha de Inicio de Actividades:</span> {empresa.inicioActividades || '01/07/2008'}</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Client Information Section */}
                <div className="border border-black p-3 mb-2 text-[11px] leading-relaxed grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-7 space-y-0.5">
                    <p><span className="font-bold">Razón Social:</span> {selectedBudget.razonSocialNombre} {selectedBudget.apellido}</p>
                    <p><span className="font-bold">Domicilio:</span> {selectedBudget.domicilio || '.- , .'} {selectedBudget.codigoPostal ? `(CP ${selectedBudget.codigoPostal})` : ''}</p>
                    <p><span className="font-bold">Condición Fiscal:</span> {selectedBudget.condicionFiscal}</p>
                    <p><span className="font-bold">Condición de Venta:</span> {selectedBudget.condicionVenta}</p>
                  </div>
                  <div className="col-span-12 sm:col-span-5 text-right space-y-0.5">
                    <p><span className="font-bold">CUIT / DNI:</span> {selectedBudget.dniCuit || '1'}</p>
                    {selectedBudget.telefono && <p><span className="font-bold">Teléfono:</span> {selectedBudget.telefono}</p>}
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-black mb-2 overflow-hidden min-h-[220px]">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-200 border-b border-black font-bold text-[10px]">
                        <th className="p-1.5 border-r border-black w-14 text-center">Cant.</th>
                        <th className="p-1.5 border-r border-black">Descripción</th>
                        <th className="p-1.5 border-r border-black text-right w-24">P. Unit.</th>
                        <th className="p-1.5 border-r border-black text-center w-16">% Desc.</th>
                        <th className="p-1.5 text-right w-24">SubTotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                      {selectedBudget.items.map((item, i) => (
                        <tr key={i}>
                          <td className="p-1.5 border-r border-black text-center">{Number(item.cantidad || 0).toFixed(2)}</td>
                          <td className="p-1.5 border-r border-black font-sans">{item.descripcion}</td>
                          <td className="p-1.5 border-r border-black text-right">{Number(item.precioUnitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-1.5 border-r border-black text-center">{Number(item.descuentoPorcentaje || 0).toFixed(2)}</td>
                          <td className="p-1.5 text-right font-bold">{Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Footer Section */}
                <div className="border border-black p-3 grid grid-cols-12 gap-2 text-[10px]">
                  {/* Left Notes & Amount in Words */}
                  <div className="col-span-7 flex flex-col justify-between pr-2">
                    <div>
                      <p className="font-bold uppercase mb-0.5">Son Pesos:</p>
                      <p className="font-serif italic text-[11px] leading-tight">
                        {numberToWordsSpanish(selectedBudget.importeTotal)}
                      </p>
                    </div>

                    {selectedBudget.observaciones && (
                      <div className="mt-2 text-[9px] text-slate-700">
                        <strong>Obs:</strong> {selectedBudget.observaciones}
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-slate-300 text-[9px] flex justify-between">
                      <span>Ord. Compra: ____________</span>
                      <span>CAE Nº: ____________</span>
                    </div>
                  </div>

                  {/* Right Column Totals */}
                  <div className="col-span-5 border-l border-black pl-3 space-y-1 font-mono text-right">
                    <div className="flex justify-between">
                      <span>Sub Total:</span>
                      <span>{Number(selectedBudget.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Descuento:</span>
                      <span>{Number(selectedBudget.descuentoTotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Percepciones:</span>
                      <span>{Number(selectedBudget.percepciones || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between font-bold text-xs border-t border-black pt-1.5 mt-1 bg-slate-100 p-1">
                      <span>IMPORTE TOTAL:</span>
                      <span>{Number(selectedBudget.importeTotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* Interactive Send Budget Modal */}
      <SendBudgetModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        budget={sendModalBudget}
        initialChannel={sendModalChannel}
      />

      {/* Convert to Sale Confirmation Modal */}
      {budgetToConvert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Convertir a Venta Real</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Presupuesto {budgetToConvert.numeroPresupuesto}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              <p><span className="font-semibold text-slate-900 dark:text-slate-100">Cliente:</span> {budgetToConvert.razonSocialNombre} {budgetToConvert.apellido || ''}</p>
              <p><span className="font-semibold text-slate-900 dark:text-slate-100">Importe Total:</span> {formatCurrency(budgetToConvert.importeTotal)}</p>
              <p><span className="font-semibold text-slate-900 dark:text-slate-100">Cantidad de productos:</span> {budgetToConvert.items.length} ítem(s)</p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 p-2.5 rounded border border-emerald-200 dark:border-emerald-800 mt-2 font-medium">
                Al confirmar, se registrará inmediatamente como una Venta Real en la planilla principal y el presupuesto cambiará su estado a "Convertido".
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBudgetToConvert(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Venta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
