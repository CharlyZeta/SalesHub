import React, { useState, type Dispatch, type SetStateAction } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Edit2,
  Sliders,
  Globe,
  Truck,
  ClipboardList,
  FileCode,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Editor genérico de listas de etiquetas (canales / métodos de pago / envíos /
 * estados de envío): formulario de alta, chips con edición inline y borrado.
 * Extraído de ConfigModal para no duplicar 4 bloques idénticos de ~110 líneas.
 */
interface TagListEditorProps {
  title: string;
  icon: LucideIcon;
  iconClassName: string; // color del ícono del título
  addPlaceholder: string;
  addButtonClassName: string; // colores del botón "Agregar"
  inputFocusClassName: string; // color de foco del input de alta
  items: string[];
  onAdd: (value: string) => boolean; // true si se agregó
  onEdit: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function TagListEditor({
  title,
  icon: Icon,
  iconClassName,
  addPlaceholder,
  addButtonClassName,
  inputFocusClassName,
  items,
  onAdd,
  onEdit,
  onRemove,
}: TagListEditorProps) {
  const [newValue, setNewValue] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAdd(newValue.trim())) {
      setNewValue('');
    }
  };

  const handleSaveEdit = () => {
    if (!editingText.trim() || editingIdx === null) return;
    onEdit(editingIdx, editingText.trim());
    setEditingIdx(null);
  };

  return (
    <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconClassName}`} />
          {title}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {items.length} configurados
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder={addPlaceholder}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className={`flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs focus:outline-none ${inputFocusClassName} shadow-2xs`}
        />
        <button
          type="submit"
          className={`${addButtonClassName} text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0`}
        >
          <Plus className="w-4 h-4" />
          <span>Agregar</span>
        </button>
      </form>

      <div className="flex flex-wrap gap-2 pt-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            {editingIdx === index ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-350 dark:border-slate-650 rounded px-1.5 py-0.5 text-xs focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                />
                <button type="button" onClick={handleSaveEdit} className="text-emerald-600 hover:text-emerald-800 p-0.5">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="font-medium">{item}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIdx(index);
                    setEditingText(item);
                  }}
                  className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface ConfigGeneralTabProps {
  canales: string[];
  setCanales: Dispatch<SetStateAction<string[]>>;
  metodosPago: string[];
  setMetodosPago: Dispatch<SetStateAction<string[]>>;
  metodosEnvio: string[];
  setMetodosEnvio: Dispatch<SetStateAction<string[]>>;
  estadosEnvio: string[];
  setEstadosEnvio: Dispatch<SetStateAction<string[]>>;
  andreaniHash: string;
  setAndreaniHash: (value: string) => void;
  puntoVenta: string;
  setPuntoVenta: (value: string) => void;
  ultimoNumero: number;
  setUltimoNumero: (value: number) => void;
  onOpenImport?: () => void;
  onClose: () => void;
}

/**
 * Pestaña "General & Ventas" del modal de configuración: canales, métodos de
 * pago, métodos/estados de envío, hash Andreani, secuencia de presupuestos e
 * importación inicial de datos.
 */
export const ConfigGeneralTab: React.FC<ConfigGeneralTabProps> = ({
  canales,
  setCanales,
  metodosPago,
  setMetodosPago,
  metodosEnvio,
  setMetodosEnvio,
  estadosEnvio,
  setEstadosEnvio,
  andreaniHash,
  setAndreaniHash,
  puntoVenta,
  setPuntoVenta,
  ultimoNumero,
  setUltimoNumero,
  onOpenImport,
  onClose,
}) => {
  const addChannel = (value: string): boolean => {
    if (!value) return false;
    if (canales.includes(value)) {
      alert('Este canal ya existe.');
      return false;
    }
    setCanales((prev) => [...prev, value]);
    return true;
  };

  const removeChannel = (index: number) => {
    if (canales.length <= 1) {
      alert('Debe haber al menos un canal de venta.');
      return;
    }
    setCanales((prev) => prev.filter((_, i) => i !== index));
  };

  const editChannel = (index: number, value: string) => {
    setCanales((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addPaymentMethod = (value: string): boolean => {
    if (!value) return false;
    if (metodosPago.includes(value)) {
      alert('Este método de pago ya existe.');
      return false;
    }
    setMetodosPago((prev) => [...prev, value]);
    return true;
  };

  const removePaymentMethod = (index: number) => {
    if (metodosPago.length <= 1) {
      alert('Debe haber al menos un método de pago.');
      return;
    }
    setMetodosPago((prev) => prev.filter((_, i) => i !== index));
  };

  const editPaymentMethod = (index: number, value: string) => {
    setMetodosPago((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addShippingMethod = (value: string): boolean => {
    if (!value) return false;
    if (metodosEnvio.includes(value)) {
      alert('Este método de envío ya existe.');
      return false;
    }
    setMetodosEnvio((prev) => [...prev, value]);
    return true;
  };

  const removeShippingMethod = (index: number) => {
    if (metodosEnvio.length <= 1) {
      alert('Debe haber al menos un método de envío.');
      return;
    }
    setMetodosEnvio((prev) => prev.filter((_, i) => i !== index));
  };

  const editShippingMethod = (index: number, value: string) => {
    setMetodosEnvio((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addShippingStatus = (value: string): boolean => {
    if (!value) return false;
    if (estadosEnvio.includes(value)) {
      alert('Este estado de envío ya existe.');
      return false;
    }
    setEstadosEnvio((prev) => [...prev, value]);
    return true;
  };

  const removeShippingStatus = (index: number) => {
    if (estadosEnvio.length <= 1) {
      alert('Debe haber al menos un estado de envío.');
      return;
    }
    setEstadosEnvio((prev) => prev.filter((_, i) => i !== index));
  };

  const editShippingStatus = (index: number, value: string) => {
    setEstadosEnvio((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  return (
    <>
      {/* 1. Canales de Venta */}
      <TagListEditor
        title="Canales de Venta"
        icon={Sliders}
        iconClassName="text-blue-600 dark:text-blue-400"
        addPlaceholder="Agregar nuevo canal (Ej: PedidosYa, WhatsApp, etc.)..."
        addButtonClassName="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500"
        inputFocusClassName="focus:border-blue-500"
        items={canales}
        onAdd={addChannel}
        onEdit={editChannel}
        onRemove={removeChannel}
      />

      {/* 2. Métodos de Pago */}
      <TagListEditor
        title="Métodos de Pago"
        icon={Globe}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        addPlaceholder="Agregar nuevo método de pago (Ej: Tarjeta Naranja, Bitcoin, etc.)..."
        addButtonClassName="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500"
        inputFocusClassName="focus:border-emerald-600"
        items={metodosPago}
        onAdd={addPaymentMethod}
        onEdit={editPaymentMethod}
        onRemove={removePaymentMethod}
      />

      {/* 2b. Métodos de Envío */}
      <TagListEditor
        title="Métodos de Envío"
        icon={Truck}
        iconClassName="text-blue-600 dark:text-blue-400"
        addPlaceholder="Agregar nuevo método de envío (Ej: Motomensajería, Retiro en Depósito, etc.)..."
        addButtonClassName="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500"
        inputFocusClassName="focus:border-blue-500"
        items={metodosEnvio}
        onAdd={addShippingMethod}
        onEdit={editShippingMethod}
        onRemove={removeShippingMethod}
      />

      {/* 2c. Estados de Envío */}
      <TagListEditor
        title="Estados de Envío"
        icon={ClipboardList}
        iconClassName="text-purple-600 dark:text-purple-400"
        addPlaceholder="Agregar nuevo estado de envío (Ej: Empaquetado, Preparando, etc.)...."
        addButtonClassName="bg-slate-900 dark:bg-purple-600 hover:bg-slate-800 dark:hover:bg-purple-500"
        inputFocusClassName="focus:border-purple-500"
        items={estadosEnvio}
        onAdd={addShippingStatus}
        onEdit={editShippingStatus}
        onRemove={removeShippingStatus}
      />

      {/* 2d. Integración con Andreani (Seguimiento) */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
            <Truck className="w-4 h-4 text-red-600 dark:text-red-400" />
            Integración con Andreani (Seguimiento de Envíos)
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
            andreaniHash ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-850 dark:border-slate-750 dark:text-slate-400'
          }`}>
            {andreaniHash ? 'Configurado' : 'No Configurado'}
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-slate-600 dark:text-slate-400 font-medium">Hash de Autenticación de Andreani (HASH_ANDREANI)</label>
          <div className="relative">
            <input
              type="password"
              placeholder="Ingrese el hash de cuenta de Andreani provisto..."
              value={andreaniHash}
              onChange={(e) => setAndreaniHash(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-red-500 shadow-2xs"
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
            Hash provisto por Andreani para la integración. Se utiliza para obtener tokens de sesión y actualizar el estado de tus envíos de forma automática.
          </p>
        </div>
      </div>

      {/* 3. Secuencia de Presupuestos */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Correlatividad y Secuencia de Presupuestos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Punto de Venta Presupuestos</label>
            <input
              type="text"
              maxLength={4}
              value={puntoVenta}
              onChange={(e) => setPuntoVenta(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
              placeholder="0001"
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1">Último Nº de Presupuesto Emitido</label>
            <input
              type="number"
              value={ultimoNumero}
              onChange={(e) => setUltimoNumero(parseInt(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
              placeholder="311"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          El próximo presupuesto se emitirá automáticamente con el formato{' '}
          <strong className="text-slate-800 dark:text-slate-200 font-mono">
            P{puntoVenta.padStart(4, '0')}-{(Number(ultimoNumero) + 1).toString().padStart(8, '0')}
          </strong>
        </p>
      </div>

      {/* 4. Importación Inicial de Datos */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Importación Inicial de Datos (Google Sheets / CSV)</span>
          </div>
          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Uso Único / Migración Inicial
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Herramienta de migración para cargar filas históricas en lote desde un archivo <strong>CSV</strong> o directamente pegando las celdas copiadas desde <strong>Google Sheets</strong>.
        </p>
        {onOpenImport && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenImport();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 py-2 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Abrir Importador de Sheets / CSV</span>
          </button>
        )}
      </div>
    </>
  );
};

export default ConfigGeneralTab;
