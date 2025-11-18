-- Adicionar coluna para contar sorteios realizados
ALTER TABLE public.sistema_config
ADD COLUMN IF NOT EXISTS total_sorteios_realizados integer NOT NULL DEFAULT 0;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.sistema_config.total_sorteios_realizados IS 'Contador de sorteios realizados no sistema';