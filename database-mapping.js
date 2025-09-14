// DATABASE SCHEMA MAPPING
// Generated at: 2025-09-14T00:59:00.913Z
// Use this file as reference for migrations

const TABLE_NAMES = {
  ACCOUNT: 'Account',
  AUTOMATION: 'Automation',
  AUTOMATIONEXECUTION: 'AutomationExecution',
  CRONJOB: 'CronJob',
  CRONJOBEXECUTION: 'CronJobExecution',
  KANBANCOLUMN: 'KanbanColumn',
  LEAD: 'Lead',
  LEADTAG: 'LeadTag',
  NOTIFICATION: 'Notification',
  PLATFORMCONFIG: 'PlatformConfig',
  SEQUELIZEMETA: 'SequelizeMeta',
  TAG: 'Tag',
  ACCOUNTS: 'accounts',
  CAMPAIGNS: 'campaigns',
  LEAD_ACTIVITIES: 'lead_activities',
  LEAD_HISTORIES: 'lead_histories',
  TRIGGER_PHRASES: 'trigger_phrases',
  USER_ACCOUNTS: 'user_accounts',
  USERS: 'users',
  WEBHOOK_LOGS: 'webhook_logs',
  WHATSAPP_ACCOUNTS: 'whatsapp_accounts'
};

const EXISTING_COLUMNS = {
  'Account': ['id', 'name', 'email', 'api_key', 'password', 'is_active', 'settings', 'created_at', 'updated_at', 'display_name', 'description', 'avatar_url', 'plan', 'custom_statuses', 'custom_loss_reasons'],
  'Automation': ['id', 'account_id', 'name', 'description', 'trigger_type', 'trigger_conditions', 'actions', 'is_active', 'priority', 'execution_count', 'last_executed_at', 'delay_minutes', 'created_at', 'updated_at'],
  'AutomationExecution': ['id', 'automation_id', 'lead_id', 'trigger_data', 'scheduled_for', 'executed_at', 'status', 'actions_completed', 'actions_total', 'error_message', 'execution_result', 'created_at', 'updated_at'],
  'CronJob': ['id', 'account_id', 'name', 'description', 'type', 'cron_expression', 'is_active', 'conditions', 'actions', 'last_run_at', 'next_run_at', 'run_count', 'success_count', 'error_count', 'last_error', 'timeout_seconds', 'max_retries', 'retry_count', 'created_at', 'updated_at'],
  'CronJobExecution': ['id', 'cron_job_id', 'started_at', 'finished_at', 'status', 'duration_ms', 'processed_items', 'affected_items', 'error_message', 'output_data', 'metadata', 'created_at', 'updated_at'],
  'KanbanColumn': ['id', 'account_id', 'name', 'position', 'color', 'is_system', 'is_active', 'created_at', 'updated_at'],
  'Lead': ['id', 'account_id', 'name', 'phone', 'email', 'platform', 'campaign', 'source_url', 'message', 'status', 'column_id', 'position', 'won_reason', 'lost_reason', 'value', 'notes', 'metadata', 'created_at', 'updated_at', 'channel', 'won_at', 'lost_at', 'assigned_to_user_id'],
  'LeadTag': ['lead_id', 'tag_id', 'created_at', 'updated_at'],
  'Notification': ['id', 'account_id', 'user_id', 'type', 'title', 'message', 'action_url', 'action_label', 'is_read', 'is_dismissed', 'priority', 'metadata', 'expires_at', 'created_at', 'updated_at'],
  'PlatformConfig': ['id', 'account_id', 'phrase', 'campaign', 'platform', 'is_active', 'created_at', 'updated_at'],
  'SequelizeMeta': ['name'],
  'Tag': ['id', 'account_id', 'name', 'color', 'description', 'created_at', 'updated_at'],
  'accounts': ['id', 'name', 'email', 'api_key', 'password', 'is_active', 'settings', 'created_at', 'updated_at', 'display_name', 'description', 'avatar_url', 'plan'],
  'campaigns': ['id', 'account_id', 'name', 'platform', 'channel', 'description', 'budget', 'target_audience', 'campaign_settings', 'start_date', 'end_date', 'is_active', 'total_leads', 'total_cost', 'cost_per_lead', 'created_at', 'updated_at'],
  'lead_activities': ['id', 'account_id', 'lead_id', 'user_id', 'activity_type', 'title', 'description', 'duration_minutes', 'status', 'scheduled_for', 'completed_at', 'metadata', 'created_at', 'updated_at'],
  'lead_histories': ['id', 'lead_id', 'account_id', 'from_column_id', 'to_column_id', 'moved_at', 'action_type', 'metadata', 'created_at', 'updated_at'],
  'trigger_phrases': ['id', 'account_id', 'campaign_id', 'phrase', 'priority', 'match_type', 'case_sensitive', 'min_confidence', 'is_active', 'total_matches', 'last_matched_at', 'created_by', 'notes', 'created_at', 'updated_at', 'creative_code'],
  'user_accounts': ['id', 'user_id', 'account_id', 'role', 'is_active', 'permissions', 'created_at', 'updated_at'],
  'users': ['id', 'account_id', 'name', 'email', 'password', 'role', 'is_active', 'last_login_at', 'created_at', 'updated_at', 'current_account_id'],
  'webhook_logs': ['id', 'account_id', 'phone_id', 'event_type', 'payload', 'processed', 'campaign_matched', 'lead_created', 'error', 'created_at', 'updated_at'],
  'whatsapp_accounts': ['id', 'account_id', 'phone_id', 'account_name', 'phone_number', 'webhook_url', 'verify_token', 'access_token', 'is_active', 'created_at', 'updated_at']
};

const EXISTING_INDEXES = {
  'Account': ['Account_pkey', 'Account_email_key33', 'Account_email_key32', 'Account_email_key31', 'Account_email_key29', 'Account_email_key28', 'Account_email_key25', 'Account_email_key23', 'Account_email_key21', 'Account_email_key18', 'Account_email_key15', 'Account_email_key13', 'Account_email_key11', 'Account_email_key10', 'Account_email_key8', 'Account_email_key6', 'Account_email_key4', 'Account_email_key', 'Account_email_key1', 'Account_email_key2', 'Account_email_key3', 'Account_email_key5', 'Account_email_key7', 'Account_email_key9', 'Account_email_key12', 'Account_email_key14', 'Account_email_key16', 'Account_email_key17', 'Account_email_key19', 'Account_email_key20', 'Account_email_key22', 'Account_email_key24', 'Account_email_key26', 'Account_email_key27', 'Account_email_key30', 'Account_email_key34'],
  'Automation': ['Automation_pkey'],
  'AutomationExecution': ['AutomationExecution_pkey'],
  'CronJob': ['CronJob_pkey'],
  'CronJobExecution': ['CronJobExecution_pkey'],
  'KanbanColumn': ['KanbanColumn_pkey'],
  'Lead': ['lead_assigned_to_user_id', 'lead_account_id_assigned_to_user_id', 'Lead_pkey', 'idx_leads_name', 'idx_leads_account_name', 'idx_leads_phone', 'idx_leads_account_phone', 'idx_leads_email', 'idx_leads_account_email', 'idx_leads_platform', 'idx_leads_account_platform', 'idx_leads_campaign', 'idx_leads_status', 'idx_leads_account_status', 'idx_leads_column_position', 'idx_leads_value', 'idx_leads_created_at', 'idx_leads_account_created', 'idx_leads_updated_at', 'idx_leads_account_column'],
  'LeadTag': ['LeadTag_pkey', 'lead_tag_lead_id_tag_id', 'idx_lead_tags_lead', 'idx_lead_tags_tag', 'idx_lead_tags_composite'],
  'Notification': ['Notification_pkey'],
  'PlatformConfig': ['PlatformConfig_pkey'],
  'SequelizeMeta': ['SequelizeMeta_pkey'],
  'Tag': ['Tag_pkey'],
  'accounts': ['accounts_pkey', 'accounts_email_key'],
  'campaigns': ['campaigns_pkey', 'campaigns_account_id', 'campaigns_platform_channel', 'campaigns_is_active'],
  'lead_activities': ['lead_activities_account_id_created_at', 'lead_activities_lead_id_created_at', 'lead_activities_user_id_created_at', 'lead_activities_activity_type', 'lead_activities_status', 'lead_activities_completed_at', 'lead_activities_pkey'],
  'lead_histories': ['lead_histories_pkey', 'lead_histories_lead_id_moved_at', 'lead_histories_account_id_moved_at', 'lead_histories_to_column_id_moved_at'],
  'trigger_phrases': ['trigger_phrases_pkey', 'trigger_phrases_account_id', 'trigger_phrases_campaign_id', 'trigger_phrases_phrase', 'trigger_phrases_priority', 'trigger_phrases_is_active', 'idx_trigger_phrases_creative_code'],
  'user_accounts': ['user_accounts_user_id_account_id', 'user_accounts_pkey', 'user_accounts_user_account_unique', 'user_accounts_user_id', 'user_accounts_account_id', 'user_accounts_is_active'],
  'users': ['users_pkey', 'users_email_key30', 'users_email_key28', 'users_email_key10', 'users_email_key8', 'users_email_key6', 'users_email_key4', 'users_email_key', 'users_email_key1', 'users_email_key2', 'users_email_key13', 'users_email_key22', 'users_email_key24', 'users_email_key25', 'users_email_key26', 'users_email_key27', 'users_email_key23', 'users_email_key21', 'users_email_key3', 'users_email_key5', 'users_email_key7', 'users_email_key9', 'users_email_key12', 'users_email_key14', 'users_email_key16', 'users_email_key19', 'users_email_key20', 'users_email_key18', 'users_email_key17', 'users_email_key15', 'users_email_key11', 'users_email_key29', 'users_email_key31'],
  'webhook_logs': ['webhook_logs_pkey'],
  'whatsapp_accounts': ['whatsapp_accounts_pkey', 'whatsapp_accounts_phone_id_key30', 'whatsapp_accounts_phone_id_key27', 'whatsapp_accounts_phone_id_key14', 'whatsapp_accounts_phone_id_key16', 'whatsapp_accounts_phone_id_key19', 'whatsapp_accounts_phone_id_key22', 'whatsapp_accounts_phone_id_key24', 'whatsapp_accounts_phone_id_key25', 'whatsapp_accounts_phone_id_key23', 'whatsapp_accounts_phone_id_key21', 'whatsapp_accounts_phone_id_key20', 'whatsapp_accounts_phone_id_key18', 'whatsapp_accounts_phone_id_key17', 'whatsapp_accounts_phone_id_key15', 'whatsapp_accounts_phone_id_key11', 'whatsapp_accounts_phone_id_key28', 'whatsapp_accounts_phone_id_key8', 'whatsapp_accounts_phone_id_key6', 'whatsapp_accounts_phone_id_key4', 'whatsapp_accounts_phone_id_key', 'whatsapp_accounts_phone_id_key1', 'whatsapp_accounts_phone_id_key2', 'whatsapp_accounts_phone_id_key3', 'whatsapp_accounts_phone_id_key5', 'whatsapp_accounts_phone_id_key7', 'whatsapp_accounts_phone_id_key9', 'whatsapp_accounts_phone_id_key10', 'whatsapp_accounts_phone_id_key12', 'whatsapp_accounts_phone_id_key13', 'whatsapp_accounts_phone_id_key26', 'whatsapp_accounts_phone_id_key29', 'whatsapp_accounts_phone_id_key31']
};

module.exports = {
  TABLE_NAMES,
  EXISTING_COLUMNS,
  EXISTING_INDEXES
};
