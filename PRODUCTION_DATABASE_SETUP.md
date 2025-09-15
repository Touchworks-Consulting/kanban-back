# Production Database Setup Options

Your Kanban CRM application uses PostgreSQL with Sequelize ORM. Here are the recommended production database options for Vercel deployment:

## Option 1: Vercel Postgres (Recommended for Vercel)

Vercel provides managed PostgreSQL databases that integrate seamlessly with your deployment.

### Setup:
1. Go to your project dashboard on Vercel
2. Navigate to the "Storage" tab
3. Click "Create Database" → "Postgres"
4. Choose your plan (free tier available)
5. Copy the connection details

### Environment Variables:
```env
# Use either individual variables:
DB_HOST=your_vercel_postgres_host
DB_PORT=5432
DB_NAME=verceldb
DB_USER=default
DB_PASSWORD=your_password

# OR use the connection URL:
DATABASE_URL=postgres://default:password@host:5432/verceldb
```

## Option 2: Neon (Serverless PostgreSQL)

Neon offers serverless PostgreSQL with generous free tier.

### Setup:
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Enable connection pooling for better performance

### Environment Variables:
```env
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Option 3: Supabase

Supabase provides PostgreSQL with additional features like real-time subscriptions.

### Setup:
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string

### Environment Variables:
```env
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

## Option 4: PlanetScale (MySQL alternative)

If you're willing to migrate from PostgreSQL to MySQL:

### Setup:
1. Sign up at https://planetscale.com
2. Create a database
3. Update your Sequelize dialect to 'mysql2'

## Database Migration Setup

You'll need to run migrations in production. Add this to your deployment process:

### Update package.json:
```json
{
  "scripts": {
    "build": "echo 'Building...'",
    "postinstall": "npm run migrate:prod",
    "migrate:prod": "NODE_ENV=production npx sequelize-cli db:migrate"
  }
}
```

### Create Sequelize config for production:
Update your `config/config.json` or create a new one:

```json
{
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    },
    "logging": false
  }
}
```

## Important Notes:

1. **SSL/TLS**: Most cloud PostgreSQL providers require SSL connections
2. **Connection Limits**: Serverless functions have connection limits - use connection pooling
3. **Migrations**: Run migrations during deployment, not at runtime
4. **Backups**: Ensure your chosen provider has automated backups
5. **Timezone**: Your app is configured for America/Sao_Paulo timezone

## Recommended Configuration:

For production, I recommend **Neon** or **Vercel Postgres** with these settings:

```javascript
// src/database/connection.js - Production optimizations
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Disable in production
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});
```