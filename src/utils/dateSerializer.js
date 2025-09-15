/**
 * Utilitário para serialização consistente de datas
 */

/**
 * Converte objetos Date para strings ISO em um objeto
 * @param {Object} obj - Objeto para processar
 * @returns {Object} - Objeto com datas convertidas
 */
function serializeDates(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Se é array, processar cada item
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }

  // Campos de data comuns
  const dateFields = [
    'createdAt', 'updatedAt', 'created_at', 'updated_at',
    'start_date', 'end_date', 'last_login_at', 'last_run_at',
    'last_matched_at', 'scheduled_for', 'executed_at', 'finished_at'
  ];

  const result = { ...obj };

  // Processar todos os campos
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    // Se é uma data
    if (value instanceof Date) {
      result[key] = value.toISOString();
    }
    // Se é string que parece ser data ISO ou PostgreSQL
    else if (typeof value === 'string' && 
             (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || 
              value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/))) {
      // Converter para Date e depois para ISO
      const dateObj = new Date(value);
      if (!isNaN(dateObj.getTime())) {
        result[key] = dateObj.toISOString();
      }
    }
    // Se é objeto aninhado, processar recursivamente
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = serializeDates(value);
    }
    // Se é array, processar cada item
    else if (Array.isArray(value)) {
      result[key] = value.map(item => serializeDates(item));
    }
  });

  return result;
}

/**
 * Processa resposta do Sequelize convertendo datas
 * @param {Object|Array} data - Dados do Sequelize
 * @returns {Object|Array} - Dados com datas serializadas
 */
function processSequelizeResponse(data) {
  if (!data) return data;

  // Se é instância do Sequelize, converter para JSON primeiro
  if (data.toJSON && typeof data.toJSON === 'function') {
    data = data.toJSON();
  }

  // Se é array de instâncias
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item && item.toJSON && typeof item.toJSON === 'function') {
        return serializeDates(item.toJSON());
      }
      return serializeDates(item);
    });
  }

  return serializeDates(data);
}

module.exports = {
  serializeDates,
  processSequelizeResponse
};