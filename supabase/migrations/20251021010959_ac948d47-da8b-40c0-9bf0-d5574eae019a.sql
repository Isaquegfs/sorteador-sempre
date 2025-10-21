-- Adicionar campos de agendamento na tabela formulario_config
ALTER TABLE public.formulario_config 
ADD COLUMN IF NOT EXISTS data_fechamento_agendado TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fechamento_automatico_ativo BOOLEAN DEFAULT false;

-- Comentários explicativos
COMMENT ON COLUMN public.formulario_config.data_fechamento_agendado IS 'Data e hora agendadas para fechamento automático do formulário';
COMMENT ON COLUMN public.formulario_config.fechamento_automatico_ativo IS 'Indica se o fechamento automático está ativo';