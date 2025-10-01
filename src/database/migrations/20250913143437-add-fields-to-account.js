'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar colunas com tratamento de duplicadas
    try {
      await queryInterface.addColumn('Account', 'display_name', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('⚠️ Coluna display_name já existe em Account');
    }

    try {
      await queryInterface.addColumn('Account', 'description', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('⚠️ Coluna description já existe em Account');
    }

    try {
      await queryInterface.addColumn('Account', 'avatar_url', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('⚠️ Coluna avatar_url já existe em Account');
    }

    try {
      await queryInterface.addColumn('Account', 'plan', {
        type: Sequelize.ENUM('free', 'basic', 'pro', 'enterprise'),
        defaultValue: 'free',
        allowNull: false,
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('⚠️ Coluna plan já existe em Account');
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Account', 'display_name');
    await queryInterface.removeColumn('Account', 'description');
    await queryInterface.removeColumn('Account', 'avatar_url');
    await queryInterface.removeColumn('Account', 'plan');
  }
};
