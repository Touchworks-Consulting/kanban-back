'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Account', 'display_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Account', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Account', 'avatar_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Account', 'plan', {
      type: Sequelize.ENUM('free', 'basic', 'pro', 'enterprise'),
      defaultValue: 'free',
      allowNull: false,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Account', 'display_name');
    await queryInterface.removeColumn('Account', 'description');
    await queryInterface.removeColumn('Account', 'avatar_url');
    await queryInterface.removeColumn('Account', 'plan');
  }
};
