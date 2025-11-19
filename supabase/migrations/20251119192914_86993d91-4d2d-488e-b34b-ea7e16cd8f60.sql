-- Remover coluna ordem_original da tabela premios_sorteados
ALTER TABLE public.premios_sorteados
DROP COLUMN IF EXISTS ordem_original;