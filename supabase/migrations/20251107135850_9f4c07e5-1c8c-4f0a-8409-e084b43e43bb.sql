-- Adicionar campo de tempo de confirmação na tabela sistema_config
ALTER TABLE public.sistema_config
ADD COLUMN IF NOT EXISTS tempo_confirmacao_segundos INTEGER DEFAULT 40;

-- Adicionar campos de confirmação na tabela sorteados
ALTER TABLE public.sorteados
ADD COLUMN IF NOT EXISTS confirmado BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS confirmado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;