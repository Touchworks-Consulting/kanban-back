const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a coluna won_at já existe
      const wonAtColumn = await queryInterface.describeTable('Lead');
      if (!wonAtColumn.won_at) {
        await queryInterface.addColumn('Lead', 'won_at', {
          type: DataTypes.DATE,
          allowNull: true
        });
        console.log('✅ Campo won_at adicionado à tabela Lead');
      } else {
        console.log('⚠️ Campo won_at já existe na tabela Lead');
      }
    } catch (error) {
      console.log('⚠️ Campo won_at já existe ou erro ao adicionar:', error.message);
    }

    try {
      // Verificar se a coluna lost_at já existe
      const lostAtColumn = await queryInterface.describeTable('Lead');
      if (!lostAtColumn.lost_at) {
        await queryInterface.addColumn('Lead', 'lost_at', {
          type: DataTypes.DATE,
          allowNull: true
        });
        console.log('✅ Campo lost_at adicionado à tabela Lead');
      } else {
        console.log('⚠️ Campo lost_at já existe na tabela Lead');
      }
    } catch (error) {
      console.log('⚠️ Campo lost_at já existe ou erro ao adicionar:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remover os campos se existirem
      await queryInterface.removeColumn('Lead', 'won_at');
      console.log('❌ Campo won_at removido da tabela Lead');
    } catch (error) {
      console.log('⚠️ Campo won_at não existe ou erro ao remover');
    }

    try {
      await queryInterface.removeColumn('Lead', 'lost_at');
      console.log('❌ Campo lost_at removido da tabela Lead');
    } catch (error) {
      console.log('⚠️ Campo lost_at não existe ou erro ao remover');
    }
  }
};