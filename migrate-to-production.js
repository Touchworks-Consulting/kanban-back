const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de produção
const productionConfig = {
  connectionString: 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
};

// Migrations pendentes identificadas pela análise
const PENDING_MIGRATIONS = [
  {
    name: '20241201000001-add-activity-priority-reminder',
    description: 'Adicionar colunas priority, reminder_at e is_overdue em lead_activities'
  },
  {
    name: '20250927-create-lead-contacts',
    description: 'Criar tabela lead_contacts'
  },
  {
    name: '20250927-create-lead-files',
    description: 'Criar tabela lead_files'
  },
  {
    name: '20250927-update-lead-activities',
    description: 'Atualizar enum de lead_activities e permitir user_id null'
  },
  {
    name: '20250928-add-activity-overdue-job-type',
    description: 'Adicionar tipo activity_overdue ao enum cron_jobs'
  }
];

class MigrationRunner {
  constructor(config) {
    this.client = new Client(config);
    this.migrations = PENDING_MIGRATIONS;
  }

  async connect() {
    await this.client.connect();
    console.log('✅ Conectado ao banco de produção');
  }

  async disconnect() {
    await this.client.end();
    console.log('👋 Desconectado do banco');
  }

  async createBackup() {
    console.log('\n📦 Criando backup das tabelas afetadas...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-production-${timestamp}.json`;

    try {
      // Backup da tabela lead_activities antes das alterações
      const activitiesBackup = await this.client.query(
        'SELECT * FROM lead_activities ORDER BY created_at DESC LIMIT 1000'
      );

      const backupData = {
        timestamp,
        tables: {
          lead_activities: activitiesBackup.rows
        }
      };

      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`✅ Backup salvo em: ${backupFile}`);
      console.log(`   - lead_activities: ${activitiesBackup.rows.length} registros`);

      return backupFile;
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error.message);
      throw error;
    }
  }

  async ensureMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        "name" VARCHAR(255) PRIMARY KEY
      );
    `;

    await this.client.query(query);
    console.log('✅ Tabela SequelizeMeta verificada');
  }

  async isMigrationApplied(migrationName) {
    const result = await this.client.query(
      'SELECT name FROM "SequelizeMeta" WHERE name = $1',
      [migrationName + '.js']
    );
    return result.rows.length > 0;
  }

  async markMigrationAsApplied(migrationName) {
    await this.client.query(
      'INSERT INTO "SequelizeMeta" (name) VALUES ($1) ON CONFLICT DO NOTHING',
      [migrationName + '.js']
    );
  }

  async runMigration(migration) {
    console.log(`\n🔄 Executando: ${migration.name}`);
    console.log(`   ${migration.description}`);

    try {
      // Iniciar transação
      await this.client.query('BEGIN');

      // Carregar e executar o arquivo de migration
      const migrationPath = path.join(
        __dirname,
        'src',
        'database',
        'migrations',
        `${migration.name}.js`
      );

      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Arquivo de migration não encontrado: ${migrationPath}`);
      }

      const migrationModule = require(migrationPath);

      // Criar um queryInterface mock que usa o client atual
      const queryInterface = {
        addColumn: async (table, column, options) => {
          const nullable = options.allowNull ? 'NULL' : 'NOT NULL';
          const defaultValue = options.defaultValue ? `DEFAULT ${this.formatDefault(options.defaultValue, options.type)}` : '';
          let type = this.mapSequelizeTypeToSQL(options.type);

          await this.client.query(
            `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type} ${nullable} ${defaultValue}`.trim()
          );
        },

        addIndex: async (table, fields, options) => {
          const indexName = options.name || `idx_${table}_${Array.isArray(fields) ? fields.join('_') : fields}`;
          const fieldsList = Array.isArray(fields) ? fields.join(', ') : fields;

          await this.client.query(
            `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (${fieldsList})`
          );
        },

        createTable: async (table, columns) => {
          const columnDefs = Object.entries(columns).map(([name, def]) => {
            return this.buildColumnDefinition(name, def);
          }).join(',\n  ');

          await this.client.query(
            `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${columnDefs}\n)`
          );
        },

        addConstraint: async (table, options) => {
          if (options.type === 'unique') {
            const fields = options.fields.join(', ');
            await this.client.query(
              `ALTER TABLE "${table}" ADD CONSTRAINT "${options.name}" UNIQUE (${fields})`
            );
          } else if (options.type === 'foreign key') {
            await this.client.query(
              `ALTER TABLE "${table}" ADD CONSTRAINT "${options.name}" FOREIGN KEY (${options.fields[0]}) REFERENCES ${options.references.table}(${options.references.field})`
            );
          }
        },

        changeColumn: async (table, column, options) => {
          const nullable = options.allowNull ? 'DROP NOT NULL' : 'SET NOT NULL';

          await this.client.query(
            `ALTER TABLE "${table}" ALTER COLUMN "${column}" ${nullable}`
          );
        },

        sequelize: this.client
      };

      // Objeto Sequelize mock
      const Sequelize = {
        UUID: 'UUID',
        UUIDV4: 'uuid_generate_v4()',
        STRING: 'VARCHAR(255)',
        TEXT: 'TEXT',
        INTEGER: 'INTEGER',
        BOOLEAN: 'BOOLEAN',
        DATE: 'TIMESTAMP WITH TIME ZONE',
        NOW: 'CURRENT_TIMESTAMP',
        ENUM: (...values) => `VARCHAR(50)`, // ENUMs serão tratados especialmente
        ARRAY: (type) => `TEXT[]`,
        DataTypes: {
          UUID: 'UUID',
          STRING: 'VARCHAR(255)',
          TEXT: 'TEXT',
          INTEGER: 'INTEGER',
          BOOLEAN: 'BOOLEAN',
          DATE: 'TIMESTAMP WITH TIME ZONE',
          ENUM: (...values) => `VARCHAR(50)`
        }
      };

      // Executar a migration
      await migrationModule.up(queryInterface, Sequelize);

      // Marcar migration como aplicada
      await this.markMigrationAsApplied(migration.name);

      // Commit da transação
      await this.client.query('COMMIT');

      console.log(`   ✅ Migration ${migration.name} aplicada com sucesso!`);

    } catch (error) {
      // Rollback em caso de erro
      await this.client.query('ROLLBACK');
      console.error(`   ❌ Erro ao executar migration ${migration.name}:`, error.message);
      throw error;
    }
  }

  formatDefault(value, type) {
    if (value === 'NOW' || value === 'CURRENT_TIMESTAMP') {
      return 'CURRENT_TIMESTAMP';
    }
    if (value === 'uuid_generate_v4()') {
      return 'uuid_generate_v4()';
    }
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (Array.isArray(value)) {
      return `ARRAY[]::TEXT[]`;
    }
    return value;
  }

  mapSequelizeTypeToSQL(type) {
    if (typeof type === 'string') {
      return type;
    }

    const typeMap = {
      'UUID': 'UUID',
      'STRING': 'VARCHAR(255)',
      'TEXT': 'TEXT',
      'INTEGER': 'INTEGER',
      'BOOLEAN': 'BOOLEAN',
      'DATE': 'TIMESTAMP WITH TIME ZONE'
    };

    return typeMap[type] || 'VARCHAR(255)';
  }

  buildColumnDefinition(name, def) {
    let sql = `"${name}" `;

    // Tipo
    if (def.type) {
      sql += this.mapSequelizeTypeToSQL(def.type);
    }

    // Primary Key
    if (def.primaryKey) {
      sql += ' PRIMARY KEY';
    }

    // Default
    if (def.defaultValue) {
      sql += ` DEFAULT ${this.formatDefault(def.defaultValue, def.type)}`;
    }

    // Nullable
    if (def.allowNull === false) {
      sql += ' NOT NULL';
    }

    // References (Foreign Key)
    if (def.references) {
      sql += ` REFERENCES "${def.references.model}"("${def.references.key}")`;
      if (def.onUpdate) sql += ` ON UPDATE ${def.onUpdate}`;
      if (def.onDelete) sql += ` ON DELETE ${def.onDelete}`;
    }

    return sql;
  }

  async run() {
    console.log('🚀 INICIANDO MIGRAÇÃO PARA PRODUÇÃO\n');
    console.log('=' + '='.repeat(79));
    console.log(`\nMigrações pendentes: ${this.migrations.length}`);
    this.migrations.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name}`);
      console.log(`     ${m.description}`);
    });
    console.log('\n' + '='.repeat(80));

    try {
      await this.connect();
      await this.ensureMigrationsTable();

      // Criar backup
      const backupFile = await this.createBackup();

      console.log('\n📋 Verificando quais migrations já foram aplicadas...');

      let appliedCount = 0;
      let newCount = 0;

      for (const migration of this.migrations) {
        const isApplied = await this.isMigrationApplied(migration.name);

        if (isApplied) {
          console.log(`⏭️  ${migration.name} - JÁ APLICADA`);
          appliedCount++;
        } else {
          await this.runMigration(migration);
          newCount++;
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n');
      console.log(`📊 Resultado:`);
      console.log(`   - Total de migrations: ${this.migrations.length}`);
      console.log(`   - Já aplicadas: ${appliedCount}`);
      console.log(`   - Aplicadas agora: ${newCount}`);
      console.log(`   - Backup salvo em: ${backupFile}`);
      console.log('\n' + '='.repeat(80));

    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ ERRO DURANTE A MIGRAÇÃO');
      console.error('=' + '='.repeat(79));
      console.error(error);
      console.error('\n⚠️  O banco foi revertido ao estado anterior (ROLLBACK)');
      console.error('=' + '='.repeat(79));
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Executar migrations
const runner = new MigrationRunner(productionConfig);
runner.run();