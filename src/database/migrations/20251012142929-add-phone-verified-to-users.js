'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Verificar se a coluna já existe
      const tableDescription = await queryInterface.describeTable('users');

      if (!tableDescription.phone_verified) {
        await queryInterface.addColumn('users', 'phone_verified', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        });
      } else {
        console.log('Coluna phone_verified já existe na tabela users');
      }
    } catch (error) {
      console.error('Erro na migration add-phone-verified-to-users:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'phone_verified');
  }
};
