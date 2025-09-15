'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar qual é o nome correto da tabela de accounts
    let accountsTableName = 'accounts';
    try {
      await queryInterface.describeTable('Accounts');
      accountsTableName = 'Accounts';
    } catch (e) {
      try {
        await queryInterface.describeTable('accounts');
        accountsTableName = 'accounts';
      } catch (e2) {
        console.log('Neither Accounts nor accounts table found, creating accounts table');
        // Se não existir nenhuma, criar a tabela accounts
        await queryInterface.createTable('accounts', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false
          },
          email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
              isEmail: true
            }
          },
          api_key: {
            type: Sequelize.STRING,
            allowNull: true,
            unique: false
          },
          password: {
            type: Sequelize.STRING,
            allowNull: true
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
          },
          settings: {
            type: Sequelize.JSON,
            defaultValue: {}
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        });
      }
    }
    // Criar tabela de relacionamento User-Account (many-to-many)
    await queryInterface.createTable('user_accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: accountsTableName,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      role: {
        type: Sequelize.ENUM('owner', 'admin', 'member'),
        defaultValue: 'member',
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      permissions: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Adicionar índices únicos e de performance
    await queryInterface.addIndex('user_accounts', ['user_id', 'account_id'], {
      unique: true,
      name: 'user_accounts_user_account_unique'
    });
    
    await queryInterface.addIndex('user_accounts', ['user_id']);
    await queryInterface.addIndex('user_accounts', ['account_id']);
    await queryInterface.addIndex('user_accounts', ['is_active']);

    // Migrar dados existentes da tabela users para user_accounts
    // Primeiro, verificar se há usuários para migrar
    const users = await queryInterface.sequelize.query(
      'SELECT id, account_id, role FROM users WHERE account_id IS NOT NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      // Verificar se as accounts existem na tabela accounts
      const accountIds = [...new Set(users.map(u => u.account_id))];
      
      for (const accountId of accountIds) {
        const existingAccount = await queryInterface.sequelize.query(
          `SELECT id FROM ${accountsTableName} WHERE id = '${accountId}'`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        if (existingAccount.length === 0) {
          // Criar a account se não existir
          await queryInterface.bulkInsert(accountsTableName, [{
            id: accountId,
            name: `Account ${accountId.substring(0, 8)}`,
            email: `account-${accountId.substring(0, 8)}@example.com`,
            is_active: true,
            settings: '{}',
            created_at: new Date(),
            updated_at: new Date()
          }]);
        }
      }

      // Agora migrar os user_accounts
      for (const user of users) {
        await queryInterface.bulkInsert('user_accounts', [{
          id: require('crypto').randomUUID(),
          user_id: user.id,
          account_id: user.account_id,
          role: user.role,
          is_active: true,
          permissions: '{}',
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }
    }

    // Adicionar campo current_account_id na tabela users para contexto atual
    await queryInterface.addColumn('users', 'current_account_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: accountsTableName,
        key: 'id'
      }
    });

    // Definir a conta atual com base na conta original
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET current_account_id = account_id 
      WHERE account_id IS NOT NULL
    `);

    // Adicionar campos para multi-account no Account
    await queryInterface.addColumn(accountsTableName, 'display_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn(accountsTableName, 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn(accountsTableName, 'avatar_url', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn(accountsTableName, 'plan', {
      type: Sequelize.ENUM('free', 'basic', 'pro', 'enterprise'),
      defaultValue: 'free'
    });

    // Preencher display_name com o nome existente
    await queryInterface.sequelize.query(`
      UPDATE ${accountsTableName} 
      SET display_name = name 
      WHERE display_name IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remover campos adicionados
    await queryInterface.removeColumn('accounts', 'plan');
    await queryInterface.removeColumn('accounts', 'avatar_url');
    await queryInterface.removeColumn('accounts', 'description');
    await queryInterface.removeColumn('accounts', 'display_name');
    await queryInterface.removeColumn('users', 'current_account_id');
    
    // Remover tabela user_accounts
    await queryInterface.dropTable('user_accounts');
  }
};