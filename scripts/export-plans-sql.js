// Não usar connection existente, criar nova conexão usando .env
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function exportPlansSQL() {
  try {
    await sequelize.authenticate();

    const [plans] = await sequelize.query(`
      SELECT id, name, slug, description, price, max_users, max_leads,
             features, is_active, is_default, trial_days, stripe_price_id, sort_order,
             created_at, updated_at
      FROM plans ORDER BY sort_order
    `);

    if (plans.length === 0) {
      console.log('Nenhum plano encontrado');
      return;
    }

    console.log('-- SQL para inserir planos');
    console.log('DELETE FROM plans;');
    console.log('');

    plans.forEach(plan => {
      const features = typeof plan.features === 'string' ? plan.features : JSON.stringify(plan.features);
      const sql = `INSERT INTO plans (id, name, slug, description, price, max_users, max_leads, features, is_active, is_default, trial_days, stripe_price_id, sort_order, created_at, updated_at) VALUES ('${plan.id}', '${plan.name}', '${plan.slug}', '${plan.description?.replace(/'/g, "''")}', ${plan.price}, ${plan.max_users || 'NULL'}, ${plan.max_leads || 'NULL'}, '${features.replace(/'/g, "''")}', ${plan.is_active}, ${plan.is_default}, ${plan.trial_days}, ${plan.stripe_price_id ? "'" + plan.stripe_price_id + "'" : 'NULL'}, ${plan.sort_order}, '${plan.created_at.toISOString()}', '${plan.updated_at.toISOString()}');`;
      console.log(sql);
    });

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await sequelize.close();
  }
}

exportPlansSQL();