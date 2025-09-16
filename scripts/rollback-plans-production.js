// Script para remover os planos padrão em produção
async function rollbackPlansProduction() {
  const { Sequelize } = require('sequelize');

  // Usar DATABASE_URL diretamente (ambiente de produção)
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada. Execute com:');
    console.error('DATABASE_URL="sua-url-do-neon" node scripts/rollback-plans-production.js');
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

    // Listar planos existentes
    const [plans] = await sequelize.query(
      'SELECT id, name, slug, price, created_at FROM plans ORDER BY sort_order, created_at',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (plans.length === 0) {
      console.log('ℹ️  Nenhum plano encontrado no banco de produção');
      return;
    }

    console.log(`\n📋 Encontrados ${plans.length} planos:`);
    plans.forEach((plan, i) => {
      console.log(`   ${i + 1}. ${plan.name} (${plan.slug}) - R$ ${plan.price} - Criado em ${plan.created_at.toISOString().split('T')[0]}`);
    });

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('\n⚠️  ATENÇÃO: Deseja REMOVER todos esses planos? Esta ação é IRREVERSÍVEL! (s/N): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'sim') {
      console.log('✋ Operação cancelada pelo usuário');
      return;
    }

    // Primeiro, verificar se existem accounts usando esses planos
    const [accountsWithPlans] = await sequelize.query(
      'SELECT COUNT(*) as count FROM "Account" WHERE plan IS NOT NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (accountsWithPlans.count > 0) {
      console.log(`⚠️  ATENÇÃO: Existem ${accountsWithPlans.count} contas usando planos!`);

      const confirmAnswer = await new Promise((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question('Deseja continuar mesmo assim? Isso pode quebrar essas contas (s/N): ', (answer) => {
          rl.close();
          resolve(answer);
        });
      });

      if (confirmAnswer.toLowerCase() !== 's' && confirmAnswer.toLowerCase() !== 'sim') {
        console.log('✋ Operação cancelada por segurança');
        return;
      }

      console.log('🔄 Atualizando contas para não usarem planos específicos...');
      await sequelize.query(
        'UPDATE "Account" SET plan = null WHERE plan IS NOT NULL'
      );
      console.log('✅ Contas atualizadas');
    }

    console.log('🗑️  Removendo planos...');

    // Remover os planos padrão
    const result = await sequelize.query(
      'DELETE FROM plans WHERE slug IN (?, ?, ?, ?)',
      {
        replacements: ['free', 'starter', 'professional', 'enterprise'],
        type: Sequelize.QueryTypes.DELETE
      }
    );

    console.log(`✅ ${plans.length} planos removidos com sucesso!`);

    // Verificar se ainda há planos
    const [remainingPlans] = await sequelize.query(
      'SELECT COUNT(*) as count FROM plans',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (remainingPlans.count > 0) {
      console.log(`ℹ️  Ainda restam ${remainingPlans.count} planos no banco`);
    } else {
      console.log('✅ Todos os planos foram removidos do banco');
    }

    console.log('\n✅ Rollback dos planos concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao fazer rollback dos planos:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  rollbackPlansProduction()
    .then(() => {
      console.log('\n🎉 Script de rollback concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Falha na execução do rollback:', error.message);
      process.exit(1);
    });
}

module.exports = { rollbackPlansProduction };