-- Migração para remover keywords e atualizar match_type em trigger_phrases
-- Data: 2024-09-11

-- 1. Remover a coluna keywords
ALTER TABLE trigger_phrases DROP COLUMN IF EXISTS keywords;

-- 2. Atualizar o enum match_type para os novos valores
-- Primeiro criar o novo enum
CREATE TYPE trigger_phrase_match_type_new AS ENUM ('exact', 'contains', 'starts_with', 'ends_with', 'regex');

-- Atualizar valores existentes para o novo formato
UPDATE trigger_phrases SET match_type = 'contains' WHERE match_type = 'keyword';
UPDATE trigger_phrases SET match_type = 'contains' WHERE match_type = 'fuzzy';

-- Alterar a coluna para usar o novo enum
ALTER TABLE trigger_phrases 
    ALTER COLUMN match_type TYPE trigger_phrase_match_type_new 
    USING match_type::text::trigger_phrase_match_type_new;

-- Remover o enum antigo e renomear o novo
DROP TYPE IF EXISTS trigger_phrase_match_type;
ALTER TYPE trigger_phrase_match_type_new RENAME TO trigger_phrase_match_type;

-- 3. Adicionar creative_code se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'trigger_phrases' 
                  AND column_name = 'creative_code') THEN
        ALTER TABLE trigger_phrases ADD COLUMN creative_code VARCHAR(255);
    END IF;
END $$;

-- 4. Atualizar default value para match_type
ALTER TABLE trigger_phrases ALTER COLUMN match_type SET DEFAULT 'contains';