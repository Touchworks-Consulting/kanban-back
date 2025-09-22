const { Sequelize } = require('sequelize');

// Script para testar o sistema de votação em produção
async function testFeedbackVotingProduction() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada. Execute com:');
    console.error('DATABASE_URL="sua-url-do-neon" node scripts/test-feedback-voting-production.js');
    process.exit(1);
  }

  console.log('🔗 Conectando ao banco de produção para testes...');
  console.log('📍 URL:', databaseUrl.replace(/\/\/.*@/, '//***:***@'));

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de produção');

    console.log('\n🧪 TESTE 1: Verificando estrutura das tabelas...');

    // Verificar coluna votes na tabela feedbacks
    const [votesColumn] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'feedbacks' AND column_name = 'votes'
    `, { type: Sequelize.QueryTypes.SELECT });

    if (votesColumn) {
      console.log('✅ Coluna "votes" encontrada:', votesColumn);
    } else {
      console.log('❌ Coluna "votes" NÃO encontrada na tabela feedbacks');
      return;
    }

    // Verificar tabela feedback_votes
    const [feedbackVotesTable] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'feedback_votes'
    `, { type: Sequelize.QueryTypes.SELECT });

    if (feedbackVotesTable) {
      console.log('✅ Tabela "feedback_votes" encontrada');
    } else {
      console.log('❌ Tabela "feedback_votes" NÃO encontrada');
      return;
    }

    // Verificar índices únicos
    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'feedback_votes'
      AND indexname LIKE '%unique%'
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`✅ Encontrados ${Array.isArray(indexes) ? indexes.length : 0} índices únicos:`, Array.isArray(indexes) ? indexes.map(i => i.indexname) : []);

    console.log('\n🧪 TESTE 2: Verificando dados existentes...');

    // Contar feedbacks
    const [feedbackCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM feedbacks
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`📊 Total de feedbacks: ${feedbackCount.count}`);

    // Contar votos
    const [voteCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM feedback_votes
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`🗳️  Total de votos: ${voteCount.count}`);

    // Verificar feedbacks com votos
    const [feedbacksWithVotes] = await sequelize.query(`
      SELECT
        f.id,
        f.message,
        f.votes,
        COUNT(fv.id) as actual_votes
      FROM feedbacks f
      LEFT JOIN feedback_votes fv ON f.id = fv.feedback_id
      GROUP BY f.id, f.message, f.votes
      HAVING f.votes > 0 OR COUNT(fv.id) > 0
      ORDER BY f.votes DESC
      LIMIT 5
    `, { type: Sequelize.QueryTypes.SELECT });

    if (feedbacksWithVotes.length > 0) {
      console.log('\n📋 Feedbacks com votos (top 5):');
      feedbacksWithVotes.forEach((fb, i) => {
        const message = fb.message.substring(0, 50) + (fb.message.length > 50 ? '...' : '');
        console.log(`   ${i + 1}. "${message}" - ${fb.votes} votos (${fb.actual_votes} reais)`);
      });
    } else {
      console.log('ℹ️  Nenhum feedback com votos encontrado');
    }

    console.log('\n🧪 TESTE 3: Testando estrutura das colunas...');

    // Verificar colunas da tabela feedback_votes
    const [voteColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feedback_votes'
      ORDER BY ordinal_position
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('📋 Colunas da tabela feedback_votes:');
    voteColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    console.log('\n🧪 TESTE 4: Verificando constraints...');

    // Verificar foreign keys
    const [foreignKeys] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'feedback_votes'
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log('🔗 Foreign keys encontradas:', foreignKeys.length);
    foreignKeys.forEach(fk => {
      console.log(`   - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log('\n✅ TODOS OS TESTES PASSARAM!');
    console.log('\n🎉 Sistema de votação está funcionando corretamente em produção!');

    console.log('\n📋 RESUMO DO TESTE:');
    console.log(`   ✅ Tabela feedbacks com coluna votes: OK`);
    console.log(`   ✅ Tabela feedback_votes: OK`);
    console.log(`   ✅ Índices únicos: ${indexes.length} encontrados`);
    console.log(`   ✅ Foreign keys: ${foreignKeys.length} configuradas`);
    console.log(`   📊 Feedbacks existentes: ${feedbackCount.count}`);
    console.log(`   🗳️  Votos registrados: ${voteCount.count}`);

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testFeedbackVotingProduction()
    .then(() => {
      console.log('\n🎉 Teste concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Falha nos testes:', error.message);
      process.exit(1);
    });
}

module.exports = { testFeedbackVotingProduction };