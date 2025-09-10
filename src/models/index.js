const Account = require('./Account');
const Lead = require('./Lead');
const KanbanColumn = require('./KanbanColumn');
const Tag = require('./Tag');
const LeadTag = require('./LeadTag');
const PlatformConfig = require('./PlatformConfig');
const CronJob = require('./CronJob');
const CronJobExecution = require('./CronJobExecution');
const Automation = require('./Automation');
const AutomationExecution = require('./AutomationExecution');

// Account associations
Account.hasMany(Lead, { foreignKey: 'account_id', as: 'leads' });
Account.hasMany(KanbanColumn, { foreignKey: 'account_id', as: 'columns' });
Account.hasMany(Tag, { foreignKey: 'account_id', as: 'tags' });
Account.hasMany(PlatformConfig, { foreignKey: 'account_id', as: 'platformConfigs' });
Account.hasMany(CronJob, { foreignKey: 'account_id', as: 'cronJobs' });
Account.hasMany(Automation, { foreignKey: 'account_id', as: 'automations' });

// Lead associations
Lead.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Lead.belongsTo(KanbanColumn, { foreignKey: 'column_id', as: 'column' });
Lead.belongsToMany(Tag, { 
  through: LeadTag, 
  foreignKey: 'lead_id', 
  otherKey: 'tag_id',
  as: 'tags'
});

// KanbanColumn associations
KanbanColumn.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
KanbanColumn.hasMany(Lead, { foreignKey: 'column_id', as: 'leads' });

// Tag associations
Tag.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Tag.belongsToMany(Lead, { 
  through: LeadTag, 
  foreignKey: 'tag_id', 
  otherKey: 'lead_id',
  as: 'leads'
});

// PlatformConfig associations
PlatformConfig.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

// CronJob associations
CronJob.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
CronJob.hasMany(CronJobExecution, { foreignKey: 'cron_job_id', as: 'executions' });

// CronJobExecution associations
CronJobExecution.belongsTo(CronJob, { foreignKey: 'cron_job_id', as: 'cronJob' });

// Automation associations
Automation.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Automation.hasMany(AutomationExecution, { foreignKey: 'automation_id', as: 'executions' });

// AutomationExecution associations
AutomationExecution.belongsTo(Automation, { foreignKey: 'automation_id', as: 'automation' });
AutomationExecution.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

module.exports = {
  Account,
  Lead,
  KanbanColumn,
  Tag,
  LeadTag,
  PlatformConfig,
  CronJob,
  CronJobExecution,
  Automation,
  AutomationExecution
};
