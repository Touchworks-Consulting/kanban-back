const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campos won_at e lost_at na tabela Lead
    await queryInterface.addColumn('Lead', 'won_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('Lead', 'lost_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
    
    console.log('✅ Campos won_at e lost_at adicionados à tabela Lead');
  },

  down: async (queryInterface, Sequelize) => {
    // Remover os campos se necessário reverter
    await queryInterface.removeColumn('Lead', 'won_at');
    await queryInterface.removeColumn('Lead', 'lost_at');
    
    console.log('❌ Campos won_at e lost_at removidos da tabela Lead');
  }
};