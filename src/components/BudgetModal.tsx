import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Plus, CheckCircle2, List, Eye, AlertCircle } from 'lucide-react';
import { Budget, BudgetItem, Customer, CatalogProduct, AppConfig } from '../types';
import { formatCurrency } from '../utils/formatters';
import { SendBudgetModal } from './SendBudgetModal';
import { addSystemLog } from '../utils/logger';
import { useBudgetCalculation, calculateBudgetItemSubtotal } from '../hooks/useBudgetCalculation';
import { BudgetListTab } from './budget/BudgetListTab';
import { BudgetPrintPreview } from './budget/BudgetPrintPreview';
import { BudgetEditorTab } from './budget/BudgetEditorTab';

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
    nombre: 'Mi Empresa',
    subtitulo: '',
    logoUrl: '',
    mostrarLogo: false,
    domicilio: '',
    telefono: '',
    email: '',
    cuit: '',
    iibb: '',
    condicionIva: '',
    inicioActividades: ''
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

  // Items State
  const [items, setItems] = useState<BudgetItem[]>([
    { id: '1', descripcion: '', cantidad: 1, precioUnitario: 0, descuentoPorcentaje: 0, subtotal: 0 }
  ]);
  const [percepciones, setPercepciones] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Reactively calculate totals using useBudgetCalculation
  const calculations = useBudgetCalculation(items, percepciones);

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

  const handleOpenSendModal = (budget: Budget, channel: 'whatsapp' | 'email') => {
    setSendModalBudget(budget);
    setSendModalChannel(channel);
    setSendModalOpen(true);
  };

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
      currentItem.subtotal = calculateBudgetItemSubtotal(cant, pu, desc);
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

    updated[index] = {
      ...updated[index],
      descripcion: catalogItem.nombre,
      precioUnitario: pu,
      descuentoPorcentaje: desc,
      subtotal: calculateBudgetItemSubtotal(cant, pu, desc),
      imagenUrl: catalogItem.imagenUrl
    };
    setItems(updated);
  };

  // Submit Budget Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!razonSocialNombre.trim()) {
      setFormError('Por favor, ingresa el nombre o Razón Social del cliente.');
      return;
    }

    if (items.some((i) => !i.descripcion.trim() || Number(i.cantidad) <= 0)) {
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
      subtotal: calculations.rawSubtotal,
      descuentoTotal: calculations.descuentoTotal,
      percepciones: Number(percepciones),
      importeTotal: calculations.importeTotalCalculado,
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

    setSuccessMessage(
      `¡Presupuesto ${b.numeroPresupuesto} convertido con éxito en Venta Real! Se ha añadido el comprobante a las ventas registradas.`
    );
    setBudgetToConvert(null);
  };

  // PDF Generation function (html-to-image + jsPDF)
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

      const numero = selectedBudget.numeroPresupuesto || 'S/N';
      const clienteRaw = `${selectedBudget.razonSocialNombre || ''} ${selectedBudget.apellido || ''}`.trim() || 'SIN_CLIENTE';
      const cliente = clienteRaw.replace(/\s+/g, '_').replace(/[^\w\-áéíóúÁÉÍÓÚñÑ]/g, '');
      const fecha = (selectedBudget.fechaEmision || new Date().toISOString().split('T')[0]).replace(/-/g, '');
      const filename = `Presupuesto_${numero}_${cliente}_${fecha}.pdf`;

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
      addSystemLog('INFO', 'Presupuestos', `Presupuesto ${selectedBudget.numeroPresupuesto} exportado a PDF (${filename})`);
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      setFormError('No se pudo generar el PDF automáticamente. Usá el botón "Imprimir" y en el diálogo elegí "Guardar como PDF".');
      addSystemLog('ERROR', 'Presupuestos', `Error al generar PDF de presupuesto: ${err?.message || err}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print function: clone sheet into dedicated print-only container
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
      addSystemLog('INFO', 'Presupuestos', `Presupuesto ${selectedBudget?.numeroPresupuesto || 'N/A'} enviado a impresión`);
    } catch (err: any) {
      console.error('Error al abrir el diálogo de impresión:', err);
      addSystemLog('ERROR', 'Presupuestos', `Error al imprimir presupuesto: ${err?.message || err}`);
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
            type="button"
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
            type="button"
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
              type="button"
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
            <BudgetEditorTab
              selectedBudget={selectedBudget}
              config={config}
              customers={customers}
              catalog={catalog}
              fechaEmision={fechaEmision}
              setFechaEmision={setFechaEmision}
              esClienteAgendado={esClienteAgendado}
              setEsClienteAgendado={setEsClienteAgendado}
              selectedCustomerSearch={selectedCustomerSearch}
              setSelectedCustomerSearch={setSelectedCustomerSearch}
              showCustomerDropdown={showCustomerDropdown}
              setShowCustomerDropdown={setShowCustomerDropdown}
              isCustomerSearchLoading={isCustomerSearchLoading}
              setIsCustomerSearchLoading={setIsCustomerSearchLoading}
              clienteId={clienteId}
              razonSocialNombre={razonSocialNombre}
              setRazonSocialNombre={setRazonSocialNombre}
              apellido={apellido}
              setApellido={setApellido}
              dniCuit={dniCuit}
              setDniCuit={setDniCuit}
              domicilio={domicilio}
              setDomicilio={setDomicilio}
              telefono={telefono}
              setTelefono={setTelefono}
              email={email}
              setEmail={setEmail}
              codigoPostal={codigoPostal}
              setCodigoPostal={setCodigoPostal}
              condicionFiscal={condicionFiscal}
              setCondicionFiscal={setCondicionFiscal}
              condicionVenta={condicionVenta}
              setCondicionVenta={setCondicionVenta}
              items={items}
              percepciones={percepciones}
              setPercepciones={setPercepciones}
              observaciones={observaciones}
              setObservaciones={setObservaciones}
              customerDropdownRef={customerDropdownRef}
              handleSelectCustomer={handleSelectCustomer}
              handleAddItemRow={handleAddItemRow}
              handleRemoveItemRow={handleRemoveItemRow}
              handleItemChange={handleItemChange}
              handleSelectCatalogItem={handleSelectCatalogItem}
              calculations={calculations}
              handleSubmitForm={handleSubmitForm}
              onClose={onClose}
            />
          )}

          {/* TAB 2: Historial / Lista de Presupuestos */}
          {activeTab === 'list' && (
            <BudgetListTab
              budgets={budgets}
              onNewBudget={handleNewBudget}
              onOpenSendModal={handleOpenSendModal}
              onPreviewBudget={handlePreviewBudget}
              onEditBudget={handleEditBudget}
              onConvert={handleConvert}
              onDeleteBudget={onDeleteBudget}
            />
          )}

          {/* TAB 3: Visual Printable PDF Document Preview */}
          {activeTab === 'preview' && selectedBudget && (
            <BudgetPrintPreview
              selectedBudget={selectedBudget}
              empresa={empresa}
              isGeneratingPdf={isGeneratingPdf}
              onOpenSendModal={handleOpenSendModal}
              onDownloadPdf={handleDownloadPdf}
              onPrint={handlePrint}
              onConvert={handleConvert}
            />
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
