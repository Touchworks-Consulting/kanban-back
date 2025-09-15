/**
 * Gera uma chave API aleatória
 * @param {number} length - Tamanho da chave (padrão: 32)
 * @returns {string} Chave API
 */
function generateApiKey(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Valida formato de email
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de telefone brasileiro
 * @param {string} phone
 * @returns {boolean}
 */
function isValidBrazilianPhone(phone) {
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Verifica se tem 10 ou 11 dígitos (com ou sem 9 no celular)
  return /^(\d{10}|\d{11})$/.test(cleanPhone);
}

/**
 * Formata telefone brasileiro
 * @param {string} phone
 * @returns {string}
 */
function formatBrazilianPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 11) {
    // Celular: (XX) 9XXXX-XXXX
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Sanitiza string removendo caracteres especiais
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Converte string para slug (URL-friendly)
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Formata valor monetário em reais
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

/**
 * Calcula diferença em dias entre duas datas
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number}
 */
function daysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

/**
 * Verifica se a data está no range especificado
 * @param {Date} date
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {boolean}
 */
function isDateInRange(date, startDate, endDate) {
  return date >= startDate && date <= endDate;
}

module.exports = {
  generateApiKey,
  isValidEmail,
  isValidBrazilianPhone,
  formatBrazilianPhone,
  sanitizeString,
  slugify,
  formatCurrency,
  daysDifference,
  isDateInRange
};
