require('dotenv').config();
const { Lead } = require('./src/models');
const { Op, Sequelize } = require('sequelize');

async function fixConversionDates() {
  try {
    console.log('🔧 Corrigindo dados de conversão...');
    
    // Limpar lost_at de leads com status won
    const wonLeads = await Lead.update(
      { lost_at: null },
      {
        where: {
          status: 'won',
          lost_at: { [Op.not]: null }
        },
        returning: true
      }
    );

    // Limpar won_at de leads com status lost
    const lostLeads = await Lead.update(
      { won_at: null },
      {
        where: {
          status: 'lost',
          won_at: { [Op.not]: null }
        },
        returning: true
      }
    );

    // Limpar ambos campos de leads com outros status
    const otherLeads = await Lead.update(
      { won_at: null, lost_at: null },
      {
        where: {
          status: { [Op.notIn]: ['won', 'lost'] },
          [Op.or]: [
            { won_at: { [Op.not]: null } },
            { lost_at: { [Op.not]: null } }
          ]
        },
        returning: true
      }
    );
    
    console.log(`✅ Dados corrigidos:`);
    console.log(`   - ${wonLeads[0]} leads "won" com lost_at limpo`);
    console.log(`   - ${lostLeads[0]} leads "lost" com won_at limpo`);
    console.log(`   - ${otherLeads[0]} leads outros status com campos limpos`);
    
    // Mostrar estatísticas atuais
    const stats = await Lead.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', '*'), 'count'],
        [Sequelize.fn('COUNT', Sequelize.col('won_at')), 'won_at_count'],
        [Sequelize.fn('COUNT', Sequelize.col('lost_at')), 'lost_at_count']
      ],
      group: ['status'],
      raw: true
    });
    
    console.log('📊 Estatísticas atuais:');
    stats.forEach(stat => {
      console.log(`   - ${stat.status}: ${stat.count} leads, ${stat.won_at_count} com won_at, ${stat.lost_at_count} com lost_at`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

fixConversionDates();