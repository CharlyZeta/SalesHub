import React, { useState, useEffect } from 'react';
import { ShieldCheck, RotateCcw, Check, Info } from 'lucide-react';
import { PermissionLevel, RolePermissions } from '../../types';
import { TOOL_REGISTRY, getDefaultOperadorPermissions } from '../../config/toolRegistry';
import { getRolePermissions, saveRolePermissions } from '../../services/permissionService';

export const ConfigPermissionsTab: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermissions>(getRolePermissions);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setPermissions(getRolePermissions());
  }, []);

  const handleLevelChange = (toolId: string, level: PermissionLevel) => {
    setPermissions((prev) => ({
      ...prev,
      OPERADOR: {
        ...prev.OPERADOR,
        [toolId]: level,
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Deseas restablecer los permisos de Operador a la configuración recomendada?')) {
      const defaultOperador = getDefaultOperadorPermissions();
      setPermissions((prev) => ({
        ...prev,
        OPERADOR: defaultOperador,
      }));
      setHasChanges(true);
      setSaveSuccess(false);
    }
  };

  const handleSave = () => {
    saveRolePermissions(permissions);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Agrupar herramientas por categoría
  const categorias = [
    { id: 'operativa', label: 'Operativa Diaria de Ventas' },
    { id: 'gestion', label: 'Gestión Comercial & Catálogo' },
    { id: 'sistema', label: 'Configuración & Sistema' },
  ];

  return (
    <div className="space-y-5">
      {/* Cabecera explicativa */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Matriz de Permisos por Herramienta (RBAC)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Define qué herramientas puede ver cada rol y si tiene permisos de modificación o solo lectura.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Restablecer a valores por defecto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valores Sugeridos</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar Permisos</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>¡Matriz de permisos guardada y aplicada con éxito a todas las sesiones!</span>
        </div>
      )}

      {/* Referencia de niveles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200">
          <strong className="block font-bold">🔴 Sin Acceso (none):</strong>
          Herramienta oculta en la barra superior. El operador no puede acceder ni ver la información.
        </div>
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200">
          <strong className="block font-bold">🟡 Solo Lectura (read):</strong>
          Puede consultar grillas y reportes. Se bloquean/ocultan botones de crear, editar, eliminar o sincronizar.
        </div>
        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200">
          <strong className="block font-bold">🟢 Control Total (full):</strong>
          Operación completa con permisos de creación, edición y eliminación de datos.
        </div>
      </div>

      {/* Tablas por categoría */}
      <div className="space-y-4">
        {categorias.map((cat) => {
          const tools = TOOL_REGISTRY.filter((t) => t.categoria === cat.id);
          if (tools.length === 0) return null;

          return (
            <div
              key={cat.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs"
            >
              <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {cat.label}
                </span>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const currentLevel = permissions.OPERADOR?.[tool.id] || tool.defaultOperador;

                  return (
                    <div
                      key={tool.id}
                      className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Información de la herramienta */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{tool.nombre}</h4>
                            <span className="font-mono text-[10px] text-slate-400">({tool.id})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{tool.descripcion}</p>
                        </div>
                      </div>

                      {/* Selectores de Permiso para Operador y Admin */}
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Permisos de Operador */}
                        <div className="space-y-1">
                          <span className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                            Rol Operador:
                          </span>
                          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
                            {/* None */}
                            <button
                              type="button"
                              onClick={() => handleLevelChange(tool.id, 'none')}
                              className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                                currentLevel === 'none'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                              }`}
                            >
                              Sin Acceso
                            </button>

                            {/* Read */}
                            {tool.permiteSoloLectura ? (
                              <button
                                type="button"
                                onClick={() => handleLevelChange(tool.id, 'read')}
                                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                                  currentLevel === 'read'
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
                                }`}
                              >
                                Solo Lectura
                              </button>
                            ) : null}

                            {/* Full */}
                            <button
                              type="button"
                              onClick={() => handleLevelChange(tool.id, 'full')}
                              className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                                currentLevel === 'full'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                              }`}
                            >
                              Total
                            </button>
                          </div>
                        </div>

                        {/* Admin Badge Inmutable */}
                        <div className="space-y-1 text-center">
                          <span className="block text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                            Admin:
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                            Total
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <span>
          <strong>Extensibilidad Automática:</strong> Cualquier funcionalidad o módulo adicional que se incorpore al
          sistema en el futuro se registrará en el Tool Registry y heredará de inmediato esta política granular de
          control sin necesidad de programar permisos manuales.
        </span>
      </div>
    </div>
  );
};

export default ConfigPermissionsTab;
