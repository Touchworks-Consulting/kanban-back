const { Sequelize } = require('sequelize');

// Force load pg driver to avoid Vercel issues
try {
  require('pg');
} catch (err) {
  console.warn('PostgreSQL driver not found, continuing anyway...');
}

// Create a function to get Sequelize instance
function createSequelizeInstance() {
  console.log('🔌 DATABASE CONNECTION INFO:');
  console.log('📍 NODE_ENV:', process.env.NODE_ENV);
  console.log('🏢 DATABASE_URL exists:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log('🔗 Using DATABASE_URL:', maskedUrl);
  } else {
    console.log('⚠️  DATABASE_URL não encontrada, usando configuração local');
    console.log('🏠 DB_HOST:', process.env.DB_HOST || 'localhost');
    console.log('🔢 DB_NAME:', process.env.DB_NAME || 'kanban_crm');
  }

  const config = {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '-03:00', // America/Sao_Paulo timezone
    dialectOptions: {
      timezone: 'America/Sao_Paulo',
      useUTC: false, // Use local timezone for dates
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
      // Ensure dates are serialized as ISO strings
      defaultScope: {
        attributes: {
          exclude: []
        }
      }
    },
    pool: {
      max: process.env.NODE_ENV === 'production' ? 1 : 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };

  if (process.env.DATABASE_URL) {
    console.log('✅ Conectando ao banco de produção via DATABASE_URL');
    return new Sequelize(process.env.DATABASE_URL, config);
  }

  // PROTEÇÃO: Em produção, nunca usar configuração local
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERRO CRÍTICO: DATABASE_URL não configurada em produção!');
    throw new Error('DATABASE_URL é obrigatória em ambiente de produção');
  }

  console.log('🏠 Conectando ao banco local (desenvolvimento)');
  return new Sequelize({
    ...config,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'kanban_crm',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });
}

// Create initial instance
const sequelize = createSequelizeInstance();

// Global hook para serialização de datas
sequelize.addHook('afterFind', (instances, options) => {
  if (!instances) return;
  
  const dateFields = ['createdAt', 'updatedAt', 'created_at', 'updated_at', 'start_date', 'end_date', 'last_login_at', 'last_run_at', 'last_matched_at'];
  
  const processInstance = (instance) => {
    if (!instance) return;
    
    if (Array.isArray(instance)) {
      instance.forEach(processInstance);
      return;
    }
    
    // Processar dataValues
    if (instance.dataValues) {
      dateFields.forEach(field => {
        if (instance.dataValues[field] instanceof Date) {
          instance.dataValues[field] = instance.dataValues[field].toISOString();
        }
      });
    }
    
    // Processar propriedades diretas
    dateFields.forEach(field => {
      if (instance[field] instanceof Date) {
        instance[field] = instance[field].toISOString();
      }
    });
  };
  
  processInstance(instances);
});

module.exports = { sequelize, createSequelizeInstance };
