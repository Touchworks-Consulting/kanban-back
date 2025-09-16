const { createSequelizeInstance } = require('../database/connection');

// Cache da instância de conexão
let cachedSequelize = null;
let isClosing = false;

async function getSequelizeConnection() {
  // Se já temos uma instância válida e não está fechando, reutiliza
  if (cachedSequelize && !isClosing) {
    try {
      // Testa a conexão para verificar se ainda está válida
      await cachedSequelize.authenticate();
      return cachedSequelize;
    } catch (error) {
      console.log('Cached connection failed, creating new one:', error.message);
      cachedSequelize = null;
    }
  }

  // Cria nova instância
  isClosing = false;
  cachedSequelize = createSequelizeInstance();

  try {
    await cachedSequelize.authenticate();
    console.log('New database connection established');
    return cachedSequelize;
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    cachedSequelize = null;
    throw error;
  }
}

async function closeConnection() {
  if (cachedSequelize && !isClosing) {
    try {
      isClosing = true;
      await cachedSequelize.close();
      console.log('Database connection closed');
    } catch (error) {
      console.warn('Error closing connection:', error.message);
    } finally {
      cachedSequelize = null;
      isClosing = false;
    }
  }
}

// Para uso em middleware que garante fechamento da conexão
function withDatabase(handler) {
  return async (req, res) => {
    let sequelize;
    try {
      sequelize = await getSequelizeConnection();
      req.db = sequelize;
      return await handler(req, res);
    } catch (error) {
      console.error('Database middleware error:', error);
      throw error;
    } finally {
      // Em serverless, sempre fechamos a conexão no final da requisição
      if (process.env.NODE_ENV === 'production') {
        await closeConnection();
      }
    }
  };
}

module.exports = {
  getSequelizeConnection,
  closeConnection,
  withDatabase
};