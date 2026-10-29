import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { AppUser, UserRole, AuthMode, SecurityConfig } from '../../types';
import { getUsers, createUser, updateUser, deleteUser, ensureDefaultAdminExists } from '../../services/userService';

export interface ConfigUsersTabProps {
  secConfig: SecurityConfig;
  setSecConfig: React.Dispatch<React.SetStateAction<SecurityConfig>>;
  currentRole?: UserRole;
}

export const ConfigUsersTab: React.FC<ConfigUsersTabProps> = ({ secConfig, setSecConfig }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Campos del formulario
  const [formData, setFormData] = useState({
    username: '',
    nombre: '',
    rol: 'OPERADOR' as UserRole,
    passwordPlain: '',
    pinPlain: '',
    activo: true,
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = async () => {
    try {
      const list = await ensureDefaultAdminExists();
      setUsers(list);
    } catch {
      setUsers(getUsers());
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      nombre: '',
      rol: 'OPERADOR',
      passwordPlain: '',
      pinPlain: '',
      activo: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
      passwordPlain: '', // Dejar vacío para no cambiar
      pinPlain: '', // Dejar vacío para no cambiar
      activo: user.activo,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          nombre: formData.nombre,
          rol: formData.rol,
          activo: formData.activo,
          passwordPlain: formData.passwordPlain || undefined,
          pinPlain: formData.pinPlain !== '' ? formData.pinPlain : undefined,
        });
      } else {
        await createUser({
          username: formData.username,
          nombre: formData.nombre,
          rol: formData.rol,
          passwordPlain: formData.passwordPlain,
          pinPlain: formData.pinPlain || undefined,
        });
      }
      await loadUsers();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: AppUser) => {
    if (!window.confirm(`¿Confirmas eliminar la cuenta de "${user.nombre}" (@${user.username})?`)) {
      return;
    }
    try {
      await deleteUser(user.id);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Política General de Autenticación */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Política de Inicio de Sesión & Seguridad</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={secConfig.seguridadHabilitada}
              onChange={(e) => setSecConfig({ ...secConfig, seguridadHabilitada: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
            />
            <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
              {secConfig.seguridadHabilitada ? 'Seguridad Activada' : 'Seguridad Desactivada'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Modo de Autenticación en Puesto:
            </label>
            <select
              value={secConfig.modoAutenticacion || 'hibrido_pin_o_password'}
              onChange={(e) => setSecConfig({ ...secConfig, modoAutenticacion: e.target.value as AuthMode })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs font-medium cursor-pointer"
            >
              <option value="hibrido_pin_o_password">Híbrido (PIN Rápido en mostrador o Contraseña)</option>
              <option value="solo_password">Estricto (Solo Usuario y Contraseña)</option>
              <option value="solo_pin">Solo PIN Rápido</option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {secConfig.modoAutenticacion === 'solo_password'
                ? 'Mayor rigor: exige escribir usuario y contraseña en cada acceso.'
                : 'Permite a los operadores digitar rápidamente su PIN de 4 dígitos para agilizar la atención.'}
            </p>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Autobloqueo por Inactividad (Puesto desatendido):
            </label>
            <div className="relative">
              <select
                value={secConfig.tiempoInactividadMinutos ?? 15}
                onChange={(e) => setSecConfig({ ...secConfig, tiempoInactividadMinutos: Number(e.target.value) })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs font-medium cursor-pointer"
              >
                <option value={2}>2 Minutos</option>
                <option value={5}>5 Minutos (Recomendado Mostrador)</option>
                <option value={10}>10 Minutos</option>
                <option value={15}>15 Minutos</option>
                <option value={30}>30 Minutos</option>
                <option value={0}>Desactivado (Nunca autobloquear)</option>
              </select>
              <Timer className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Bloquea la terminal si no se detecta movimiento de teclado o mouse.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Cuentas de Usuario */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Cuentas de Operadores y Administradores ({users.length})</span>
          </div>
          <button
            type="button"
            onClick={handleOpenNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        {/* Tabla de Usuarios */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-2.5">Usuario</th>
                <th className="p-2.5">Nombre Completo</th>
                <th className="p-2.5">Rol</th>
                <th className="p-2.5 text-center">PIN Rápido</th>
                <th className="p-2.5 text-center">Estado</th>
                <th className="p-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">@{u.username}</td>
                  <td className="p-2.5 text-slate-800 dark:text-slate-200 font-medium">{u.nombre}</td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.rol === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {u.rol === 'ADMIN' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      <span>{u.rol}</span>
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    {u.pinHash ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        <KeyRound className="w-3 h-3" />
                        <span>Configurado</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Sin PIN</span>
                    )}
                  </td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.activo
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(u)}
                      className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors cursor-pointer"
                      title="Editar usuario o credenciales"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      disabled={u.rol === 'ADMIN' && users.filter((x) => x.rol === 'ADMIN' && x.activo).length <= 1}
                      className="p-1 text-slate-500 hover:text-rose-600 disabled:opacity-30 rounded transition-colors cursor-pointer"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Alta / Edición de Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{editingUser ? `Editar @${editingUser.username}` : 'Nuevo Usuario'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-4 space-y-3 text-xs">
              {formError && (
                <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Usuario (Login):</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUser)}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="ej: juan"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Rol en Sistema:</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="OPERADOR">OPERADOR (Ventas/Mostrador)</option>
                    <option value="ADMIN">ADMINISTRADOR (Total)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="ej: Juan Pérez"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    {editingUser ? 'Nueva Contraseña:' : 'Contraseña:'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.passwordPlain}
                    onChange={(e) => setFormData({ ...formData, passwordPlain: e.target.value })}
                    placeholder={editingUser ? '•••• (vacío=mantener)' : 'Mínimo 4 caracteres'}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    PIN Rápido (4-6 dígitos):
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formData.pinPlain}
                    onChange={(e) => setFormData({ ...formData, pinPlain: e.target.value.replace(/\D/g, '') })}
                    placeholder={editingUser ? '•••• (vacío=mantener)' : 'Opcional mostrador'}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-center tracking-widest"
                  />
                </div>
              </div>

              {editingUser && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Usuario Habilitado / Activo</span>
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-1.5 rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigUsersTab;
