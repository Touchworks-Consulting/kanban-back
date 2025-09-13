require('dotenv').config();
const { Lead } = require('./src/models');
const { Op } = require('sequelize');

async function fixWonAtDates() {
  console.log('🔧 Iniciando correção dos campos won_at...');
  
  try {
    // Buscar todos os leads com status 'won' mas sem won_at
    const leadsToFix = await Lead.findAll({
      where: {
        status: 'won',
        won_at: null
      }
    });
    
    console.log(`📊 Encontrados ${leadsToFix.length} leads para corrigir`);
    
    if (leadsToFix.length === 0) {
      console.log('✅ Nenhum lead precisa de correção!');
      return;
    }
    
    // Atualizar cada lead individualmente para ter mais controle
    let fixed = 0;
    for (const lead of leadsToFix) {
      // Usar updatedAt como won_at (aproximação razoável)
      await lead.update({
        won_at: lead.updatedAt
      });
      fixed++;
      
      console.log(`✅ Lead ${lead.name} (${lead.id}) - won_at definido como ${lead.updatedAt}`);
    }
    
    console.log(`🎉 Correção concluída! ${fixed} leads atualizados.`);
    
    // Verificar se agora funcionará
    console.log('\n🧪 Testando query de tempo de conversão...');
    const testResults = await Lead.findAll({
      where: {
        status: 'won',
        won_at: { [Op.not]: null },
        campaign: { [Op.not]: null }
      },
      attributes: [
        'campaign',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'total_conversions'],
        [
          Lead.sequelize.fn(
            'AVG', 
            Lead.sequelize.fn(
              'EXTRACT',
              Lead.sequelize.literal("EPOCH FROM (won_at - created_at)")
            )
          ), 
          'avg_seconds_to_conversion'
        ]
      ],
      group: ['campaign'],
      raw: true
    });
    
    console.log('📈 Resultados do teste:');
    console.log(JSON.stringify(testResults, null, 2));
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  } finally {
    process.exit(0);
  }
}

fixWonAtDates();