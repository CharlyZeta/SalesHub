import { Budget } from '../types';
import { formatCurrency } from './formatters';

/**
 * Clean and format phone number for WhatsApp international API (wa.me)
 * Special logic for Argentine area codes and mobile prefix rules.
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove spaces, parentheses, dashes, plus signs
  let cleaned = phone.replace(/[\s\(\)\-\+]/g, '');

  // If starts with 0 (e.g. 0342...), strip leading 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If 12 digits and has 15 after 3-digit area code (e.g. 342154883135), remove 15
  if (cleaned.length === 12 && cleaned.substring(3, 5) === '15') {
    cleaned = cleaned.substring(0, 3) + cleaned.substring(5);
  }

  // If 10 digits (e.g. 3424883135) and doesn't start with 54, prepend 549 (AR mobile code)
  if (cleaned.length === 10 && !cleaned.startsWith('54')) {
    cleaned = '549' + cleaned;
  }

  // If starts with 54 and is 12 digits (54 + 10 digits without 9), insert 9 after 54
  if (cleaned.startsWith('54') && !cleaned.startsWith('549') && cleaned.length === 12) {
    cleaned = '549' + cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Formats a clean, readable WhatsApp message body for a given budget
 */
export function generateBudgetWhatsAppText(budget: Budget): string {
  const itemsList = budget.items
    .map(i => `• ${i.descripcion} (x${i.cantidad}) - ${formatCurrency(i.subtotal)}`)
    .join('\n');

  const fechaFormatted = budget.fechaEmision.split('-').reverse().join('/');

  return `*DUAL S.R.L. - Presupuesto N° ${budget.numeroPresupuesto}*

Hola *${budget.razonSocialNombre}*, le compartimos el detalle de su presupuesto:

📅 *Fecha de Emisión:* ${fechaFormatted}
📄 *Comprobante:* ${budget.numeroPresupuesto}
💳 *Condición de Venta:* ${budget.condicionVenta}

*DETALLE DE PRODUCTOS:*
${itemsList}

-------------------------------
*SUBTOTAL:* ${formatCurrency(budget.subtotal)}
${budget.descuentoTotal > 0 ? `*DESCUENTO:* -${formatCurrency(budget.descuentoTotal)}\n` : ''}${budget.percepciones > 0 ? `*PERCEPCIONES:* ${formatCurrency(budget.percepciones)}\n` : ''}💰 *TOTAL ESTIMADO: ${formatCurrency(budget.importeTotal)}*
-------------------------------
${budget.observaciones ? `📌 *Observaciones:* ${budget.observaciones}\n` : ''}
Cualquier consulta quedamos a su entera disposición.

*DUAL S.R.L.* - Equipamientos para Comercio y Hogar
Estanislao Zeballos 3825, Santa Fe | Tel: 0342-4883135`;
}

/**
 * Generates subject line for email delivery
 */
export function generateBudgetEmailSubject(budget: Budget): string {
  return `Presupuesto N° ${budget.numeroPresupuesto} - DUAL S.R.L.`;
}

/**
 * Generates plain text email body for a given budget
 */
export function generateBudgetEmailBody(budget: Budget): string {
  const itemsList = budget.items
    .map(i => `  - ${i.descripcion} (Cant: ${i.cantidad}) - ${formatCurrency(i.subtotal)}`)
    .join('\n');

  const fechaFormatted = budget.fechaEmision.split('-').reverse().join('/');

  return `Estimado/a ${budget.razonSocialNombre},

Le enviamos el presupuesto solicitado correspondiente a DUAL S.R.L.

--------------------------------------------------
RESUMEN DEL PRESUPUESTO N° ${budget.numeroPresupuesto}
--------------------------------------------------
Fecha de Emisión: ${fechaFormatted}
Cliente: ${budget.razonSocialNombre} ${budget.apellido || ''}
CUIT/DNI: ${budget.dniCuit || 'N/A'}
Condición de Venta: ${budget.condicionVenta}

DETALLE DE ITEMS:
${itemsList}

--------------------------------------------------
Subtotal: ${formatCurrency(budget.subtotal)}
${budget.descuentoTotal > 0 ? `Descuento: -${formatCurrency(budget.descuentoTotal)}\n` : ''}${budget.percepciones > 0 ? `Percepciones: ${formatCurrency(budget.percepciones)}\n` : ''}IMPORTE TOTAL: ${formatCurrency(budget.importeTotal)}
--------------------------------------------------

${budget.observaciones ? `Observaciones: ${budget.observaciones}\n\n` : ''}Quedamos a su entera disposición ante cualquier consulta.

Atentamente,
DUAL S.R.L. - Equipamientos para Comercio y Hogar
Estanislao Zeballos 3825, Santa Fe
Tel: 0342-4883135 | Email: dualdesantafe@hotmail.com`;
}

/**
 * Builds the wa.me URL and opens WhatsApp web/app
 */
export function openWhatsAppForBudget(budget: Budget, customPhone?: string): { success: boolean; url: string; cleanPhone: string } {
  const targetPhone = customPhone !== undefined ? customPhone : budget.telefono;
  const cleanPhone = formatWhatsAppPhone(targetPhone);
  const text = generateBudgetWhatsAppText(budget);
  
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }

  return {
    success: true,
    url,
    cleanPhone
  };
}

/**
 * Builds mailto: link and triggers email client
 */
export function openEmailForBudget(budget: Budget, customEmail?: string): { success: boolean; mailtoUrl: string; recipientEmail: string } {
  const recipientEmail = (customEmail !== undefined ? customEmail : (budget.email || '')).trim();
  const subject = generateBudgetEmailSubject(budget);
  const body = generateBudgetEmailBody(budget);

  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  if (typeof window !== 'undefined') {
    window.location.href = mailtoUrl;
  }

  return {
    success: true,
    mailtoUrl,
    recipientEmail
  };
}
