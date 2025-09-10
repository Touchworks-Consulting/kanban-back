const { sequelize } = require('./src/database/connection');
const Account = require('./src/models/Account');

async function listAccounts() {
  await sequelize.sync();
  const accounts = await Account.findAll();
  accounts.forEach(acc => {
    console.log(`ID: ${acc.id}\nName: ${acc.name}\nEmail: ${acc.email}\nAPI Key: ${acc.api_key}\nActive: ${acc.is_active}\n---`);
  });
}

listAccounts().then(() => process.exit(0));
