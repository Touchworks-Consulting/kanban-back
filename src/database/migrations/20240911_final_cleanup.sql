-- Migração final para limpar campanhas e frases gatilho
-- Data: 2024-09-11
-- Remove keywords obrigatório e creative_code de campanha
-- Move creative_code para trigger_phrases como obrigatório

-- 1. Remover coluna creative_code de campaigns (se existir)
ALTER TABLE campaigns DROP COLUMN IF EXISTS creative_code;

-- 2. Remover coluna keywords de trigger_phrases (se existir)  
ALTER TABLE trigger_phrases DROP COLUMN IF EXISTS keywords;

-- 3. Tornar creative_code obrigatório em trigger_phrases
-- Primeiro adicionar valores padrão onde estiver NULL
UPDATE trigger_phrases 
SET creative_code = 'LEGACY_' || id 
WHERE creative_code IS NULL OR creative_code = '';

-- Agora tornar NOT NULL
ALTER TABLE trigger_phrases 
ALTER COLUMN creative_code SET NOT NULL;

-- 4. Remover índice único de creative_code de campaigns (se existir)
DROP INDEX IF EXISTS campaigns_creative_code;