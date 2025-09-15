require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: process.env.DATABASE_URL ? 'DATABASE_URL' : null,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '753951',
    database: process.env.DB_NAME || 'kanban_crm',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  },
  test: {
    use_env_variable: process.env.DATABASE_URL ? 'DATABASE_URL' : null,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '753951',
    database: process.env.DB_NAME || 'kanban_crm',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    dialect: 'postgres'
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};