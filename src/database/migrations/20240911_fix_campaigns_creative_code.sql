-- Migração para mover creative_code da tabela campaigns para trigger_phrases
-- Data: 2024-09-11

-- 1. Adicionar creative_code à tabela trigger_phrases se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'trigger_phrases' 
                  AND column_name = 'creative_code') THEN
        ALTER TABLE trigger_phrases ADD COLUMN creative_code VARCHAR(255);
    END IF;
END $$;

-- 2. Migrar dados existentes (copiar creative_code das campanhas para suas trigger_phrases)
UPDATE trigger_phrases 
SET creative_code = campaigns.creative_code 
FROM campaigns 
WHERE trigger_phrases.campaign_id = campaigns.id 
AND trigger_phrases.creative_code IS NULL
AND campaigns.creative_code IS NOT NULL;

-- 3. Remover a coluna creative_code da tabela campaigns
ALTER TABLE campaigns DROP COLUMN IF EXISTS creative_code;

-- 4. Remover o índice único de creative_code das campaigns (se existir)
DROP INDEX IF EXISTS campaigns_creative_code_unique;
DROP INDEX IF EXISTS campaigns_creative_code;

-- 5. Adicionar índice para creative_code nas trigger_phrases (opcional, para performance)
CREATE INDEX IF NOT EXISTS idx_trigger_phrases_creative_code ON trigger_phrases(creative_code);

-- 6. Comentário sobre a mudança
COMMENT ON COLUMN trigger_phrases.creative_code IS 'Código criativo da frase gatilho (migrado de campaigns)';