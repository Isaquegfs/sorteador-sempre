-- Remover a constraint UNIQUE da coluna ordem da tabela premios
-- Isso permite reordenação sem conflitos temporários

ALTER TABLE public.premios
DROP CONSTRAINT IF EXISTS premios_ordem_unique;

-- Criar um índice na coluna ordem para manter a performance das consultas
-- mas sem a restrição de unicidade
CREATE INDEX IF NOT EXISTS idx_premios_ordem ON public.premios(ordem);