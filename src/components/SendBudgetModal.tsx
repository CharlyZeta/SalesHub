import React, { useState } from 'react';
import { X, Send, Mail, MessageSquare, Copy, Check, ExternalLink, Phone, User, FileText } from 'lucide-react';
import { Budget } from '../types';
import { formatCurrency } from '../utils/formatters';
import { addSystemLog } from '../utils/logger';
import { 
  formatWhatsAppPhone, 
  generateBudgetWhatsAppText, 
  generateBudgetEmailSubject, 
  generateBudgetEmailBody,
  openWhatsAppForBudget,
  openEmailForBudget
} from '../utils/budgetDelivery';

interface SendBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget | null;
  initialChannel?: 'whatsapp' | 'email';
}

export const SendBudgetModal: React.FC<SendBudgetModalProps> = ({
  isOpen,
  onClose,
  budget,
  initialChannel = 'whatsapp'
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>(initialChannel);
  
  // WhatsApp State
  const [phoneMode, setPhoneMode] = useState<'customer' | 'custom'>('customer');
  const [customPhone, setCustomPhone] = useState('');
  const [copiedWA, setCopiedWA] = useState(false);

  // Email State
  const [emailMode, setEmailMode] = useState<'customer' | 'custom'>('customer');
  const [customEmail, setCustomEmail] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen || !budget) return null;

  const effectivePhone = phoneMode === 'customer' ? (budget.telefono || '') : customPhone;
  const cleanPhone = formatWhatsAppPhone(effectivePhone);
  const waText = generateBudgetWhatsAppText(budget);

  const effectiveEmail = emailMode === 'customer' ? (budget.email || '') : customEmail;
  const emailSubject = generateBudgetEmailSubject(budget);
  const emailBody = generateBudgetEmailBody(budget);

  // Handle WhatsApp Send
  const handleSendWhatsApp = () => {
    openWhatsAppForBudget(budget, effectivePhone);
    addSystemLog(
      'SYNC',
      'Presupuestos',
      `Presupuesto ${budget.numeroPresupuesto} enviado por WhatsApp`,
      {
        budgetId: budget.id,
        cliente: budget.razonSocialNombre,
        telefonoOrigen: effectivePhone,
        telefonoLimpio: cleanPhone,
        monto: budget.importeTotal
      }
    );
  };

  // Handle Copy WA message
  const handleCopyWA = () => {
    navigator.clipboard.writeText(waText);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2000);
  };

  // Handle Email Send
  const handleSendEmail = () => {
    openEmailForBudget(budget, effectiveEmail);
    addSystemLog(
      'SYNC',
      'Presupuestos',
      `Presupuesto ${budget.numeroPresupuesto} preparado para envío por Email`,
      {
        budgetId: budget.id,
        cliente: budget.razonSocialNombre,
        emailDestino: effectiveEmail,
        monto: budget.importeTotal
      }
    );
  };

  // Handle Copy Email Body
  const handleCopyEmail = () => {
    const fullContent = `Asunto: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullContent);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-2 rounded-lg">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                Enviar Presupuesto {budget.numeroPresupuesto}
              </h3>
              <p className="text-xs text-slate-300">
                Cliente: <strong className="text-white">{budget.razonSocialNombre}</strong> ({formatCurrency(budget.importeTotal)})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-1.5 flex gap-2">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Correo Electrónico</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          
          {/* TAB 1: WhatsApp */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-3">
              {/* Phone Selection */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Destinatario WhatsApp:
                </label>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phoneMode"
                      checked={phoneMode === 'customer'}
                      onChange={() => setPhoneMode('customer')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      Teléfono del cliente: <strong className="font-mono">{budget.telefono || 'Sin teléfono guardado'}</strong>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phoneMode"
                      checked={phoneMode === 'custom'}
                      onChange={() => setPhoneMode('custom')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      Enviar a otro número de WhatsApp
                    </span>
                  </label>
                </div>

                {phoneMode === 'custom' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Ej: 3424883135 o 0342 154883135"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {cleanPhone ? (
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-1.5 rounded flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Número internacional procesado: <strong className="font-mono">+{cleanPhone}</strong></span>
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-1.5 rounded">
                    ⚠️ Ingresa un número válido para iniciar la conversación directa por WhatsApp.
                  </p>
                )}
              </div>

              {/* Message Text Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Vista previa del mensaje a enviar:</label>
                  <button
                    onClick={handleCopyWA}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {copiedWA ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWA ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 text-emerald-400 dark:text-emerald-300 font-mono text-[11px] p-3 rounded-lg max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {waText}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md flex items-center gap-2 shadow-2xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Abrir WhatsApp ({cleanPhone ? `+${cleanPhone}` : 'Directo'})</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Email */}
          {activeTab === 'email' && (
            <div className="space-y-3">
              {/* Email Address Selection */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Dirección de Correo Electrónico:
                </label>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emailMode"
                      checked={emailMode === 'customer'}
                      onChange={() => setEmailMode('customer')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      Email del cliente: <strong className="font-mono">{budget.email || 'No registrado'}</strong>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emailMode"
                      checked={emailMode === 'custom'}
                      onChange={() => setEmailMode('custom')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      Enviar a otro correo electrónico
                    </span>
                  </label>
                </div>

                {emailMode === 'custom' && (
                  <div className="pt-1">
                    <input
                      type="email"
                      placeholder="cliente@ejemplo.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Subject Box */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Asunto:</label>
                <input
                  type="text"
                  readOnly
                  value={emailSubject}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Message Body Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Cuerpo del correo:</label>
                  <button
                    onClick={handleCopyEmail}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmail ? 'Copiado!' : 'Copiar Correo'}</span>
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] p-3 rounded-lg max-h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {emailBody}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Todo</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md flex items-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Enviar por Email (Mailto)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
