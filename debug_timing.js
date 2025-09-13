const { Lead, KanbanColumn, LeadHistory } = require('./src/models');
const { Op } = require('sequelize');

async function debugTiming() {
  const accountId = 'b5bbf79c-af45-4e9b-bdb8-2b4295416d10';
  const columnId = '43925da6-61f2-41e8-af28-fcd58b30d720'; // Contactado

  console.log('=== DEBUG: Stage Timing Calculation ===');

  // Buscar leads atualmente nesta coluna
  const currentLeads = await Lead.findAll({
    where: {
      account_id: accountId,
      column_id: columnId
    },
    attributes: ['id', 'name'],
    raw: true
  });

  console.log(`Found ${currentLeads.length} leads in column ${columnId}:`);
  currentLeads.forEach(lead => console.log(`- ${lead.name} (${lead.id})`));

  const timeInStage = [];

  for (const lead of currentLeads) {
    console.log(`\n--- Processing lead: ${lead.name} ---`);

    // Buscar quando este lead entrou nesta coluna (último movimento para cá)
    const entryHistory = await LeadHistory.findOne({
      where: {
        account_id: accountId,
        lead_id: lead.id,
        to_column_id: columnId
      },
      order: [['moved_at', 'DESC']]
    });

    if (entryHistory) {
      console.log(`Entry history found:`);
      console.log(`- Moved at: ${entryHistory.moved_at}`);
      console.log(`- From column: ${entryHistory.from_column_id}`);
      console.log(`- To column: ${entryHistory.to_column_id}`);

      // Calcular tempo desde que entrou na coluna até agora
      const timeSpentSoFar = new Date() - new Date(entryHistory.moved_at);
      const days = Math.floor(timeSpentSoFar / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeSpentSoFar % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      console.log(`- Time calculation:`);
      console.log(`  - Now: ${new Date()}`);
      console.log(`  - Entry: ${new Date(entryHistory.moved_at)}`);
      console.log(`  - Milliseconds diff: ${timeSpentSoFar}`);
      console.log(`  - Days: ${days}`);
      console.log(`  - Hours: ${hours}`);

      timeInStage.push(Math.max(0, days));
    } else {
      console.log('No entry history found for this lead');
    }
  }

  console.log(`\nFinal timeInStage array: [${timeInStage.join(', ')}]`);

  const avgDays = timeInStage.length > 0
    ? Math.round(timeInStage.reduce((a, b) => a + b, 0) / timeInStage.length)
    : 0;

  console.log(`Average days: ${avgDays}`);
}

debugTiming().catch(console.error);