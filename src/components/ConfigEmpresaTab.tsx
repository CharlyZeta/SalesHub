import React, { type Dispatch, type SetStateAction } from 'react';
import {
  Building2,
  Trash2,
  Upload,
  Globe,
  FileText,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';

export interface ConfigEmpresaTabProps {
  nombreEmpresa: string;
  setNombreEmpresa: (value: string) => void;
  subtituloEmpresa: string;
  setSubtituloEmpresa: (value: string) => void;
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  mostrarLogo: boolean;
  setMostrarLogo: (value: boolean) => void;
  domicilioEmpresa: string;
  setDomicilioEmpresa: (value: string) => void;
  telefonoEmpresa: string;
  setTelefonoEmpresa: (value: string) => void;
  emailEmpresa: string;
  setEmailEmpresa: (value: string) => void;
  cuitEmpresa: string;
  setCuitEmpresa: (value: string) => void;
  iibbEmpresa: string;
  setIibbEmpresa: (value: string) => void;
  condicionIvaEmpresa: string;
  setCondicionIvaEmpresa: (value: string) => void;
  inicioActividadesEmpresa: string;
  setInicioActividadesEmpresa: (value: string) => void;
  pvVenta: string;
  setPvVenta: (value: string) => void;
  pvPresupuesto: string;
  setPvPresupuesto: (value: string) => void;
  setPuntoVenta: Dispatch<SetStateAction<string>>;
}

/**
 * Pestaña "Empresa / Firma" del modal de configuración: identidad visual y
 * logotipo, datos fiscales (AFIP/ARCA), contacto comercial y puntos de venta.
 */
export const ConfigEmpresaTab: React.FC<ConfigEmpresaTabProps> = ({
  nombreEmpresa,
  setNombreEmpresa,
  subtituloEmpresa,
  setSubtituloEmpresa,
  logoUrl,
  setLogoUrl,
  mostrarLogo,
  setMostrarLogo,
  domicilioEmpresa,
  setDomicilioEmpresa,
  telefonoEmpresa,
  setTelefonoEmpresa,
  emailEmpresa,
  setEmailEmpresa,
  cuitEmpresa,
  setCuitEmpresa,
  iibbEmpresa,
  setIibbEmpresa,
  condicionIvaEmpresa,
  setCondicionIvaEmpresa,
  inicioActividadesEmpresa,
  setInicioActividadesEmpresa,
  pvVenta,
  setPvVenta,
  pvPresupuesto,
  setPvPresupuesto,
  setPuntoVenta,
}) => {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setLogoUrl(base64);
        setMostrarLogo(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setMostrarLogo(false);
  };

  return (
    <div className="space-y-5">
      {/* 1. Identidad Visual & Logotipo */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Identidad Visual & Logotipo de la Empresa
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Encabezados en Presupuestos, Remitos y Facturación
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Razón Social / Nombre Comercial *
            </label>
            <input
              type="text"
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              placeholder="Ej: Mi Empresa S.R.L."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Slogan o Subtítulo Institucional
            </label>
            <input
              type="text"
              value={subtituloEmpresa}
              onChange={(e) => setSubtituloEmpresa(e.target.value)}
              placeholder="Ej: Para Comercio y Hogar"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Logo Upload & Preview Section */}
        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3.5 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-36 h-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center overflow-hidden shrink-0 relative">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Empresa"
                className="max-h-full max-w-full object-contain p-1"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 text-[10px]">
                <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                <span>Sin Logotipo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left w-full">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                Logotipo para Documentos Impresos
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Formatos recomendados: PNG transparente o JPG. Tamaño máx: 2 MB.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <label className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{logoUrl ? 'Cambiar Imagen' : 'Subir Logotipo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer justify-center sm:justify-start">
              <input
                type="checkbox"
                checked={mostrarLogo}
                onChange={(e) => setMostrarLogo(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                Mostrar logotipo gráfico en comprobantes y presupuestos
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Datos Fiscales & Impositivos */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Datos Fiscales & Impositivos (AFIP / ARCA)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              C.U.I.T. de la Empresa
            </label>
            <input
              type="text"
              value={cuitEmpresa}
              onChange={(e) => setCuitEmpresa(e.target.value)}
              placeholder="Ej: 30710642857"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Ingresos Brutos (IIBB)
            </label>
            <input
              type="text"
              value={iibbEmpresa}
              onChange={(e) => setIibbEmpresa(e.target.value)}
              placeholder="Ej: 0111353853"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Condición frente al I.V.A.
            </label>
            <input
              type="text"
              value={condicionIvaEmpresa}
              onChange={(e) => setCondicionIvaEmpresa(e.target.value)}
              placeholder="Ej: I.V.A. Responsable Inscripto"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Fecha Inicio de Actividades
            </label>
            <input
              type="text"
              value={inicioActividadesEmpresa}
              onChange={(e) => setInicioActividadesEmpresa(e.target.value)}
              placeholder="Ej: 01/07/2008"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Domicilio & Contacto Comercial */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Ubicación & Contacto Comercial
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Domicilio Comercial / Dirección
            </label>
            <input
              type="text"
              value={domicilioEmpresa}
              onChange={(e) => setDomicilioEmpresa(e.target.value)}
              placeholder="Ej: ESTANISLAO ZEBALLOS 3825, SANTA FE."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Teléfono de Contacto
            </label>
            <input
              type="text"
              value={telefonoEmpresa}
              onChange={(e) => setTelefonoEmpresa(e.target.value)}
              placeholder="Ej: 0342-4883135"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Email Comercial
            </label>
            <input
              type="email"
              value={emailEmpresa}
              onChange={(e) => setEmailEmpresa(e.target.value)}
              placeholder="Ej: contacto@miempresa.com"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 4. Puntos de Venta (PV) */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Puntos de Venta (Prefijos de Facturas y Presupuestos)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Punto de Venta Predeterminado (Ventas / Facturas)
            </label>
            <input
              type="text"
              maxLength={4}
              value={pvVenta}
              onChange={(e) => setPvVenta(e.target.value)}
              placeholder="0003"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Utilizado como punto de venta por defecto en comprobantes fiscales (ej. FC-B-<strong>{pvVenta.padStart(4, '0')}</strong>-...).
            </p>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Punto de Venta (Presupuestos)
            </label>
            <input
              type="text"
              maxLength={4}
              value={pvPresupuesto}
              onChange={(e) => {
                setPvPresupuesto(e.target.value);
                setPuntoVenta(e.target.value);
              }}
              placeholder="0001"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Prefijo impreso en cotizaciones y presupuestos (ej. P<strong>{pvPresupuesto.padStart(4, '0')}</strong>-...).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigEmpresaTab;
