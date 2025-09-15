CREATE TABLE IF NOT EXISTS "Account" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "api_key" VARCHAR(255),
  "password" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "settings" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "display_name" VARCHAR(255),
  "description" TEXT,
  "avatar_url" VARCHAR(255),
  "plan" VARCHAR(50),
  "custom_statuses" JSONB,
  "custom_loss_reasons" JSONB,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Automation" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "trigger_type" VARCHAR(50) NOT NULL,
  "trigger_conditions" JSONB,
  "actions" JSONB,
  "is_active" BOOLEAN DEFAULT true,
  "priority" INTEGER,
  "execution_count" INTEGER,
  "last_executed_at" TIMESTAMPTZ,
  "delay_minutes" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationExecution" (
  "id" UUID NOT NULL,
  "automation_id" UUID NOT NULL,
  "lead_id" UUID,
  "trigger_data" JSONB,
  "scheduled_for" TIMESTAMPTZ,
  "executed_at" TIMESTAMPTZ,
  "status" VARCHAR(50),
  "actions_completed" INTEGER,
  "actions_total" INTEGER,
  "error_message" TEXT,
  "execution_result" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CronJob" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(50) NOT NULL,
  "cron_expression" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "conditions" JSONB,
  "actions" JSONB,
  "last_run_at" TIMESTAMPTZ,
  "next_run_at" TIMESTAMPTZ,
  "run_count" INTEGER,
  "success_count" INTEGER,
  "error_count" INTEGER,
  "last_error" TEXT,
  "timeout_seconds" INTEGER,
  "max_retries" INTEGER,
  "retry_count" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CronJobExecution" (
  "id" UUID NOT NULL,
  "cron_job_id" UUID NOT NULL,
  "started_at" TIMESTAMPTZ NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "status" VARCHAR(50),
  "duration_ms" INTEGER,
  "processed_items" INTEGER,
  "affected_items" INTEGER,
  "error_message" TEXT,
  "output_data" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "KanbanColumn" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "position" INTEGER NOT NULL,
  "color" VARCHAR(255),
  "is_system" BOOLEAN DEFAULT false,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(255),
  "email" VARCHAR(255),
  "platform" VARCHAR(255),
  "campaign" VARCHAR(255),
  "source_url" TEXT,
  "message" TEXT,
  "status" VARCHAR(50),
  "column_id" UUID,
  "position" INTEGER,
  "won_reason" VARCHAR(255),
  "lost_reason" VARCHAR(255),
  "value" NUMERIC,
  "notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "channel" VARCHAR(255),
  "won_at" TIMESTAMPTZ,
  "lost_at" TIMESTAMPTZ,
  "assigned_to_user_id" UUID,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadTag" (
  "lead_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("lead_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "user_id" UUID,
  "type" VARCHAR(50),
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "action_url" VARCHAR(255),
  "action_label" VARCHAR(255),
  "is_read" BOOLEAN DEFAULT false,
  "is_dismissed" BOOLEAN DEFAULT false,
  "priority" VARCHAR(50),
  "metadata" JSONB,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlatformConfig" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "phrase" VARCHAR(255) NOT NULL,
  "campaign" VARCHAR(255) NOT NULL,
  "platform" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Tag" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "color" VARCHAR(255),
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "api_key" VARCHAR(255),
  "password" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "settings" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "display_name" VARCHAR(255),
  "description" TEXT,
  "avatar_url" VARCHAR(255),
  "plan" VARCHAR(50),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "platform" VARCHAR(255) NOT NULL,
  "channel" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "budget" NUMERIC,
  "target_audience" JSONB,
  "campaign_settings" JSONB,
  "start_date" TIMESTAMPTZ,
  "end_date" TIMESTAMPTZ,
  "is_active" BOOLEAN DEFAULT true,
  "total_leads" INTEGER,
  "total_cost" NUMERIC,
  "cost_per_lead" NUMERIC,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "message" TEXT NOT NULL,
  "user_id" UUID,
  "user_name" VARCHAR(255),
  "user_email" VARCHAR(255),
  "account_id" UUID,
  "account_name" VARCHAR(255),
  "user_agent" TEXT,
  "ip_address" VARCHAR(255),
  "screen_resolution" VARCHAR(50),
  "browser_info" JSONB,
  "current_page" VARCHAR(500),
  "status" VARCHAR(50),
  "priority" VARCHAR(50),
  "admin_notes" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "activity_type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "duration_minutes" INTEGER,
  "status" VARCHAR(50) NOT NULL,
  "scheduled_for" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lead_histories" (
  "id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "from_column_id" UUID,
  "to_column_id" UUID NOT NULL,
  "moved_at" TIMESTAMPTZ NOT NULL,
  "action_type" VARCHAR(50),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plans" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" NUMERIC NOT NULL,
  "max_users" INTEGER,
  "max_leads" INTEGER,
  "features" JSONB NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "is_default" BOOLEAN DEFAULT false,
  "trial_days" INTEGER,
  "stripe_price_id" VARCHAR(255),
  "sort_order" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trigger_phrases" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "phrase" VARCHAR(255) NOT NULL,
  "priority" INTEGER,
  "match_type" VARCHAR(50),
  "case_sensitive" BOOLEAN DEFAULT false,
  "min_confidence" NUMERIC,
  "is_active" BOOLEAN DEFAULT true,
  "total_matches" INTEGER,
  "last_matched_at" TIMESTAMPTZ,
  "created_by" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "creative_code" VARCHAR(255),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_accounts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "role" VARCHAR(50) NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "permissions" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "role" VARCHAR(50),
  "is_active" BOOLEAN DEFAULT true,
  "last_login_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "current_account_id" UUID,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "webhook_logs" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "phone_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(255) NOT NULL,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN DEFAULT false,
  "campaign_matched" VARCHAR(255),
  "lead_created" BOOLEAN DEFAULT false,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_accounts" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "phone_id" VARCHAR(255) NOT NULL,
  "account_name" VARCHAR(255) NOT NULL,
  "phone_number" VARCHAR(255) NOT NULL,
  "webhook_url" VARCHAR(255),
  "verify_token" VARCHAR(255),
  "access_token" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);
