-- Adicionar controle de modo de teste no sistema_config
ALTER TABLE public.sistema_config
ADD COLUMN IF NOT EXISTS test_mode_active boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sistema_config.test_mode_active IS 'Indica se o sistema está em modo de testes';

-- Adicionar flag de teste nas tabelas de dados
ALTER TABLE public.participantes
ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.base_oficial
ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.premios
ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.sorteados
ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Índices para melhorar performance de filtros por is_test
CREATE INDEX IF NOT EXISTS idx_participantes_is_test ON public.participantes(is_test);
CREATE INDEX IF NOT EXISTS idx_base_oficial_is_test ON public.base_oficial(is_test);
CREATE INDEX IF NOT EXISTS idx_premios_is_test ON public.premios(is_test);
CREATE INDEX IF NOT EXISTS idx_sorteados_is_test ON public.sorteados(is_test);

-- Comentários explicativos
COMMENT ON COLUMN public.participantes.is_test IS 'Indica se é registro de teste (modo simulação)';
COMMENT ON COLUMN public.base_oficial.is_test IS 'Indica se é registro de teste (modo simulação)';
COMMENT ON COLUMN public.premios.is_test IS 'Indica se é registro de teste (modo simulação)';
COMMENT ON COLUMN public.sorteados.is_test IS 'Indica se é registro de teste (modo simulação)';