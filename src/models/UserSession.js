const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const UserSession = sequelize.define('UserSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    },
    comment: 'Conta do usuário'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID do usuário específico (se existir tabela users separada)'
  },
  session_token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Token único da sessão (JWT token hash ou session ID)'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'Endereço IP da sessão'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent do navegador'
  },
  browser_fingerprint: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Fingerprint único do navegador'
  },
  device_info: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Informações detalhadas do dispositivo/navegador'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Se a sessão está ativa'
  },
  last_activity: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Última atividade registrada na sessão'
  },
  login_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Data/hora do login'
  },
  logout_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data/hora do logout (se aplicável)'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Data de expiração da sessão'
  },
  force_logout_reason: {
    type: DataTypes.ENUM(
      'concurrent_login',    // Logout forçado por login em outro local
      'admin_action',        // Logout forçado por admin
      'security_breach',     // Logout por questões de segurança
      'plan_downgrade',      // Logout por mudança de plano
      'expired'              // Sessão expirou naturalmente
    ),
    allowNull: true,
    comment: 'Motivo do logout forçado, se aplicável'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Metadados adicionais da sessão'
  }
}, {
  tableName: 'user_sessions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['session_token']
    },
    {
      fields: ['account_id', 'is_active']
    },
    {
      fields: ['user_id', 'is_active']
    },
    {
      fields: ['last_activity']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['ip_address']
    }
  ],
  hooks: {
    beforeCreate: (session) => {
      // Define a data de expiração se não foi informada (24 horas padrão)
      if (!session.expires_at) {
        const expirationTime = new Date();
        expirationTime.setHours(expirationTime.getHours() + 24);
        session.expires_at = expirationTime;
      }
    }
  },
  scopes: {
    active: {
      where: {
        is_active: true,
        expires_at: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    },
    expired: {
      where: {
        [require('sequelize').Op.or]: [
          { is_active: false },
          { expires_at: { [require('sequelize').Op.lte]: new Date() } }
        ]
      }
    }
  }
});

// Método estático para limpar sessões expiradas
UserSession.cleanExpiredSessions = async function() {
  const expiredCount = await this.update(
    {
      is_active: false,
      logout_at: new Date(),
      force_logout_reason: 'expired'
    },
    {
      where: {
        is_active: true,
        expires_at: {
          [require('sequelize').Op.lte]: new Date()
        }
      }
    }
  );

  return expiredCount[0]; // Retorna número de sessões atualizadas
};

// Método estático para forçar logout de outras sessões do mesmo usuário
UserSession.forceLogoutOtherSessions = async function(accountId, currentSessionToken, userId = null) {
  const whereClause = {
    account_id: accountId,
    session_token: {
      [require('sequelize').Op.ne]: currentSessionToken
    },
    is_active: true
  };

  if (userId) {
    whereClause.user_id = userId;
  }

  const loggedOutCount = await this.update(
    {
      is_active: false,
      logout_at: new Date(),
      force_logout_reason: 'concurrent_login'
    },
    { where: whereClause }
  );

  return loggedOutCount[0]; // Retorna número de sessões deslogadas
};

module.exports = UserSession;