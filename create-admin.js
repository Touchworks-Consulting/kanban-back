const { Account } = require('./src/models');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
    try {
        // Sincronizar o banco
        await Account.sync({ force: true });
        
        // Criar usuário admin
        const admin = await Account.create({
            id: uuidv4(),
            name: 'Administrador',
            email: 'admin@admin.com',
            api_key: 'admin123',
            is_active: true,
            settings: {}
        });
        
        console.log('✅ Usuário admin criado:');
        console.log('Email:', admin.email);
        console.log('API Key:', admin.api_key);
        console.log('ID:', admin.id);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar admin:', error);
        process.exit(1);
    }
}

createAdmin();
