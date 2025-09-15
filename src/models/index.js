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
const User = require('./User');
const UserAccount = require('./UserAccount');
const WhatsAppAccount = require('./WhatsAppAccount');
const WebhookLog = require('./WebhookLog');
const Campaign = require('./Campaign');
const TriggerPhrase = require('./TriggerPhrase');
const LeadHistory = require('./LeadHistory');
const LeadActivity = require('./LeadActivity');
const Notification = require('./Notification');
const Feedback = require('./Feedback');

// Account associations
Account.hasMany(Lead, { foreignKey: 'account_id', as: 'leads' });
Account.hasMany(KanbanColumn, { foreignKey: 'account_id', as: 'columns' });
Account.hasMany(Tag, { foreignKey: 'account_id', as: 'tags' });
Account.hasMany(PlatformConfig, { foreignKey: 'account_id', as: 'platformConfigs' });
Account.hasMany(CronJob, { foreignKey: 'account_id', as: 'cronJobs' });
Account.hasMany(Automation, { foreignKey: 'account_id', as: 'automations' });
// Removido: Conflito com belongsToMany users na linha 84
Account.hasMany(WhatsAppAccount, { foreignKey: 'account_id', as: 'whatsappAccounts' });
Account.hasMany(WebhookLog, { foreignKey: 'account_id', as: 'webhookLogs' });
Account.hasMany(Campaign, { foreignKey: 'account_id', as: 'campaigns' });
Account.hasMany(TriggerPhrase, { foreignKey: 'account_id', as: 'triggerPhrases' });
Account.hasMany(LeadHistory, { foreignKey: 'account_id', as: 'leadHistories' });
Account.hasMany(LeadActivity, { foreignKey: 'account_id', as: 'leadActivities' });
Account.hasMany(Notification, { foreignKey: 'account_id', as: 'notifications' });

// Lead associations
Lead.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Lead.belongsTo(KanbanColumn, { foreignKey: 'column_id', as: 'column' });
Lead.belongsToMany(Tag, {
  through: LeadTag,
  foreignKey: 'lead_id',
  otherKey: 'tag_id',
  as: 'tags'
});
Lead.hasMany(LeadHistory, { foreignKey: 'lead_id', as: 'histories' });
Lead.hasMany(LeadActivity, { foreignKey: 'lead_id', as: 'activities' });
Lead.belongsTo(User, { foreignKey: 'assigned_to_user_id', as: 'assignedTo' });

// KanbanColumn associations
KanbanColumn.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
KanbanColumn.hasMany(Lead, { foreignKey: 'column_id', as: 'leads' });
KanbanColumn.hasMany(LeadHistory, { foreignKey: 'to_column_id', as: 'leadHistories' });
KanbanColumn.hasMany(LeadHistory, { foreignKey: 'from_column_id', as: 'leadHistoriesFrom' });

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

// Multi-account user associations
User.belongsToMany(Account, { 
  through: UserAccount, 
  foreignKey: 'user_id',
  otherKey: 'account_id',
  as: 'accounts'
});

Account.belongsToMany(User, { 
  through: UserAccount, 
  foreignKey: 'account_id',
  otherKey: 'user_id',
  as: 'users'
});

// UserAccount associations
UserAccount.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserAccount.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

// Current account association
User.belongsTo(Account, { foreignKey: 'current_account_id', as: 'currentAccount' });

// User sales associations
User.hasMany(Lead, { foreignKey: 'assigned_to_user_id', as: 'assignedLeads' });
User.hasMany(LeadActivity, { foreignKey: 'user_id', as: 'activities' });

// Legacy associations (manter por compatibilidade)
User.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
WhatsAppAccount.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
WebhookLog.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

// Campaign associations
Campaign.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Campaign.hasMany(TriggerPhrase, { foreignKey: 'campaign_id', as: 'triggerPhrases' });

// TriggerPhrase associations
TriggerPhrase.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
TriggerPhrase.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

// LeadHistory associations
LeadHistory.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
LeadHistory.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
LeadHistory.belongsTo(KanbanColumn, { foreignKey: 'from_column_id', as: 'fromColumn' });
LeadHistory.belongsTo(KanbanColumn, { foreignKey: 'to_column_id', as: 'toColumn' });

// LeadActivity associations
LeadActivity.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
LeadActivity.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
LeadActivity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Notification associations
Notification.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Feedback associations
Feedback.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Feedback.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

module.exports = {
  Account,
  User,
  UserAccount,
  Lead,
  KanbanColumn,
  Tag,
  LeadTag,
  PlatformConfig,
  CronJob,
  CronJobExecution,
  Automation,
  AutomationExecution,
  WhatsAppAccount,
  WebhookLog,
  Campaign,
  TriggerPhrase,
  LeadHistory,
  LeadActivity,
  Notification,
  Feedback
};
