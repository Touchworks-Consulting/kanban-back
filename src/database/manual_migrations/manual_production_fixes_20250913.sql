-- Manual production fixes (Postgres)
-- Run this file against your production DB after making a backup.
-- This script adds `custom_statuses` and `custom_loss_reasons` to `accounts`,
-- creates a GIN index, updates `trigger_phrases.creative_code`, and drops
-- legacy columns/indexes if present. All operations are guarded to avoid errors
-- when objects already exist or are missing.

BEGIN;

-- 1) Add custom_statuses to accounts if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'custom_statuses'
  ) THEN
  EXECUTE $sql$ALTER TABLE public.accounts ADD COLUMN custom_statuses JSONB DEFAULT '[{"id":"new","name":"Novo","color":"#94a3b8","order":1,"is_initial":true,"is_won":false,"is_lost":false},{"id":"contacted","name":"Contactado","color":"#3b82f6","order":2,"is_initial":false,"is_won":false,"is_lost":false},{"id":"qualified","name":"Qualificado","color":"#f59e0b","order":3,"is_initial":false,"is_won":false,"is_lost":false},{"id":"proposal","name":"Proposta","color":"#8b5cf6","order":4,"is_initial":false,"is_won":false,"is_lost":false},{"id":"won","name":"Ganho","color":"#10b981","order":5,"is_initial":false,"is_won":true,"is_lost":false},{"id":"lost","name":"Perdido","color":"#ef4444","order":6,"is_initial":false,"is_won":false,"is_lost":true}]'::jsonb;$sql$;
  END IF;
END$$;

-- Ensure no rows have NULL for custom_statuses, then set NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='custom_statuses') THEN
  EXECUTE $sql$UPDATE public.accounts SET custom_statuses = '[{"id":"new","name":"Novo","color":"#94a3b8","order":1,"is_initial":true,"is_won":false,"is_lost":false},{"id":"contacted","name":"Contactado","color":"#3b82f6","order":2,"is_initial":false,"is_won":false,"is_lost":false},{"id":"qualified","name":"Qualificado","color":"#f59e0b","order":3,"is_initial":false,"is_won":false,"is_lost":false},{"id":"proposal","name":"Proposta","color":"#8b5cf6","order":4,"is_initial":false,"is_won":false,"is_lost":false},{"id":"won","name":"Ganho","color":"#10b981","order":5,"is_initial":false,"is_won":true,"is_lost":false},{"id":"lost","name":"Perdido","color":"#ef4444","order":6,"is_initial":false,"is_won":false,"is_lost":true}]'::jsonb WHERE custom_statuses IS NULL;$sql$;
  EXECUTE $sql$ALTER TABLE public.accounts ALTER COLUMN custom_statuses SET NOT NULL;$sql$;
  END IF;
END$$;

-- 2) Add custom_loss_reasons to accounts if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'custom_loss_reasons'
  ) THEN
  EXECUTE $sql$ALTER TABLE public.accounts ADD COLUMN custom_loss_reasons JSONB DEFAULT '[{"id":"price","name":"Preço alto"},{"id":"timing","name":"Timing inadequado"},{"id":"competitor","name":"Escolheu concorrente"},{"id":"no_response","name":"Não respondeu"},{"id":"not_interested","name":"Não interessado"},{"id":"other","name":"Outro motivo"}]'::jsonb;$sql$;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='custom_loss_reasons') THEN
  EXECUTE $sql$UPDATE public.accounts SET custom_loss_reasons = '[{"id":"price","name":"Preço alto"},{"id":"timing","name":"Timing inadequado"},{"id":"competitor","name":"Escolheu concorrente"},{"id":"no_response","name":"Não respondeu"},{"id":"not_interested","name":"Não interessado"},{"id":"other","name":"Outro motivo"}]'::jsonb WHERE custom_loss_reasons IS NULL;$sql$;
  EXECUTE $sql$ALTER TABLE public.accounts ALTER COLUMN custom_loss_reasons SET NOT NULL;$sql$;
  END IF;
END$$;

-- 3) Create GIN index for custom_statuses if not exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='custom_statuses') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'account_custom_statuses_gin_idx') THEN
      EXECUTE $sql$CREATE INDEX account_custom_statuses_gin_idx ON public.accounts USING gin (custom_statuses);$sql$;
    END IF;
  END IF;
END$$;

-- 4) Final cleanup from 20240911 migration: campaigns/trigger_phrases
-- Drop creative_code from campaigns if exists
ALTER TABLE IF EXISTS public.campaigns DROP COLUMN IF EXISTS creative_code;

-- Drop keywords from trigger_phrases if exists
ALTER TABLE IF EXISTS public.trigger_phrases DROP COLUMN IF EXISTS keywords;

-- Ensure trigger_phrases.creative_code has a value and is NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trigger_phrases' AND column_name='creative_code') THEN
  -- Update NULL/empty to a legacy value based on id
  EXECUTE $sql$UPDATE public.trigger_phrases SET creative_code = ('LEGACY_' || id::text) WHERE creative_code IS NULL OR creative_code = '';$sql$;
  -- Set NOT NULL constraint
  EXECUTE $sql$ALTER TABLE public.trigger_phrases ALTER COLUMN creative_code SET NOT NULL;$sql$;
  END IF;
END$$;

-- 5) Optional: create common indexes (guarded by existence of table and index)
-- List of sample indexes used by migrations. These create indexes only if the target table is present.

-- Helper DO block pattern used below for each index

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('lead','leads')) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='i' AND relname='idx_leads_name') THEN
      EXECUTE $sql$CREATE INDEX idx_leads_name ON lead (name);$sql$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='i' AND relname='idx_leads_email') THEN
      EXECUTE $sql$CREATE INDEX idx_leads_email ON lead (email);$sql$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='i' AND relname='idx_leads_phone') THEN
      EXECUTE $sql$CREATE INDEX idx_leads_phone ON lead (phone);$sql$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='i' AND relname='idx_leads_campaign') THEN
      EXECUTE $sql$CREATE INDEX idx_leads_campaign ON lead (campaign);$sql$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='i' AND relname='idx_leads_platform') THEN
      EXECUTE $sql$CREATE INDEX idx_leads_platform ON lead (platform);$sql$;
    END IF;
    -- add more indexes as needed (value, created_at, updated_at, composites)
  END IF;
END$$;

COMMIT;

-- End of script
