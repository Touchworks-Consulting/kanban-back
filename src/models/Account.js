const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');
const bcrypt = require('bcrypt');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  api_key: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  hooks: {
    beforeCreate: async (account) => {
      if (account.password) {
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(account.password, salt);
      }
    },
    beforeUpdate: async (account) => {
      if (account.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(account.password, salt);
      }
    }
  }
});

Account.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = Account;
