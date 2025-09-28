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
const LeadContact = require('./LeadContact');
const LeadFile = require('./LeadFile');
const Notification = require('./Notification');
const Feedback = require('./Feedback');
const FeedbackVote = require('./FeedbackVote');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const UserSession = require('./UserSession');

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
Account.hasMany(LeadContact, { foreignKey: 'account_id', as: 'leadContacts' });
Account.hasMany(LeadFile, { foreignKey: 'account_id', as: 'leadFiles' });
Account.hasMany(Notification, { foreignKey: 'account_id', as: 'notifications' });
Account.hasMany(Subscription, { foreignKey: 'account_id', as: 'subscriptions' });
Account.hasMany(UserSession, { foreignKey: 'account_id', as: 'userSessions' });
Account.hasMany(Feedback, { foreignKey: 'account_id', as: 'feedback' });

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
Lead.hasMany(LeadContact, { foreignKey: 'lead_id', as: 'contacts' });
Lead.hasMany(LeadFile, { foreignKey: 'lead_id', as: 'files' });
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

// LeadContact associations
LeadContact.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
LeadContact.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

// LeadFile associations
LeadFile.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
LeadFile.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
LeadFile.belongsTo(User, { foreignKey: 'uploaded_by_user_id', as: 'uploadedBy' });

// Notification associations
Notification.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Feedback associations
Feedback.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Feedback.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Feedback.hasMany(FeedbackVote, { foreignKey: 'feedback_id', as: 'feedbackVotes' });

// FeedbackVote associations
FeedbackVote.belongsTo(Feedback, { foreignKey: 'feedback_id', as: 'feedback' });
FeedbackVote.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Plan associations
Plan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });

// Subscription associations
Subscription.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

// UserSession associations
UserSession.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });
UserSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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
  LeadContact,
  LeadFile,
  Notification,
  Feedback,
  FeedbackVote,
  Plan,
  Subscription,
  UserSession
};
