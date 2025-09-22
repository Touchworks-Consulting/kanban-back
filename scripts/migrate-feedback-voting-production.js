const { Sequelize } = require('sequelize');

// Script para executar migrações de feedback voting em produção
async function migrateFeedbackVotingProduction() {
  // Usar DATABASE_URL diretamente (ambiente de produção)
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada. Execute com:');
    console.error('DATABASE_URL="sua-url-do-neon" node scripts/migrate-feedback-voting-production.js');
    process.exit(1);
  }

  console.log('🔗 Conectando ao banco de produção...');
  console.log('📍 URL:', databaseUrl.replace(/\/\/.*@/, '//***:***@')); // Oculta credenciais

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false // Desabilitar logs SQL para limpar output
  });

  try {
    // Testar conexão
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de produção');

    console.log('🔍 Verificando estrutura atual da tabela feedbacks...');

    // Verificar se a coluna votes já existe
    const [votesColumn] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'feedbacks' AND column_name = 'votes'
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!votesColumn) {
      console.log('📝 Adicionando coluna "votes" à tabela feedbacks...');
      await sequelize.query(`
        ALTER TABLE feedbacks ADD COLUMN votes INTEGER NOT NULL DEFAULT 0;
      `);
      console.log('✅ Coluna "votes" adicionada com sucesso');
    } else {
      console.log('ℹ️  Coluna "votes" já existe na tabela feedbacks');
    }

    // Verificar se a tabela feedback_votes existe
    const [feedbackVotesTable] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'feedback_votes'
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!feedbackVotesTable) {
      console.log('📝 Criando tabela "feedback_votes"...');

      await sequelize.query(`
        CREATE TABLE feedback_votes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          ip_address VARCHAR(255),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabela "feedback_votes" criada com sucesso');

      console.log('📝 Criando índices únicos para controle de votação...');

      // Índice único para votos de usuários autenticados
      await sequelize.query(`
        CREATE UNIQUE INDEX unique_feedback_user_vote
        ON feedback_votes (feedback_id, user_id)
        WHERE user_id IS NOT NULL;
      `);

      // Índice único para votos por IP (usuários anônimos)
      await sequelize.query(`
        CREATE UNIQUE INDEX unique_feedback_ip_vote
        ON feedback_votes (feedback_id, ip_address)
        WHERE user_id IS NULL AND ip_address IS NOT NULL;
      `);

      console.log('✅ Índices únicos criados com sucesso');
    } else {
      console.log('ℹ️  Tabela "feedback_votes" já existe');
    }

    // Verificar se há feedbacks existentes e atualizar contador de votos se necessário
    console.log('🔍 Verificando feedbacks existentes...');

    const [feedbackCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM feedbacks
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`📊 Encontrados ${feedbackCount.count} feedbacks existentes`);

    if (feedbackCount.count > 0) {
      console.log('🔄 Sincronizando contadores de votos...');

      await sequelize.query(`
        UPDATE feedbacks
        SET votes = (
          SELECT COUNT(*)
          FROM feedback_votes
          WHERE feedback_votes.feedback_id = feedbacks.id
        )
      `);

      console.log('✅ Contadores de votos sincronizados');
    }

    console.log('\n🎉 Migração do sistema de votação concluída com sucesso!');
    console.log('\n📋 Resumo das alterações:');
    console.log('   ✅ Coluna "votes" na tabela feedbacks');
    console.log('   ✅ Tabela "feedback_votes" para controle de votos');
    console.log('   ✅ Índices únicos para prevenção de votos múltiplos');
    console.log('   ✅ Contadores de votos sincronizados');

    console.log('\n🚀 Sistema de votação de feedback está pronto para uso em produção!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrateFeedbackVotingProduction()
    .then(() => {
      console.log('\n🎉 Script de migração concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Falha na execução da migração:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateFeedbackVotingProduction };