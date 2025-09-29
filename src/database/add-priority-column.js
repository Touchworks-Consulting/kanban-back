const { sequelize } = require('./connection');

async function addPriorityColumn() {
  try {
    console.log('🔧 Adicionando coluna priority à tabela lead_activities...');

    // Verificar se a coluna já existe
    const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lead_activities'
      AND column_name = 'priority'
      AND table_schema = 'public'
    `);

    if (results.length > 0) {
      console.log('✅ Coluna priority já existe');
      return;
    }

    // Criar enum se não existir
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_lead_activities_priority') THEN
          CREATE TYPE "public"."enum_lead_activities_priority" AS ENUM('low', 'medium', 'high', 'urgent');
        END IF;
      END
      $$;
    `);

    // Adicionar coluna priority
    await sequelize.query(`
      ALTER TABLE "lead_activities"
      ADD COLUMN "priority" "public"."enum_lead_activities_priority" DEFAULT 'medium' NOT NULL;
    `);

    // Verificar se reminder_at existe
    const [reminderResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lead_activities'
      AND column_name = 'reminder_at'
      AND table_schema = 'public'
    `);

    if (reminderResults.length === 0) {
      console.log('🔧 Adicionando coluna reminder_at...');
      await sequelize.query(`
        ALTER TABLE "lead_activities"
        ADD COLUMN "reminder_at" TIMESTAMP WITH TIME ZONE NULL;
      `);
    }

    console.log('✅ Colunas adicionadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await addPriorityColumn();
    console.log('🎉 Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  }
}

main();