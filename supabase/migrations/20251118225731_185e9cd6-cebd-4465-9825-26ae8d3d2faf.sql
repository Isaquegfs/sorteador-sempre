-- Criar tabela para registrar sorteios concluídos
CREATE TABLE public.sorteios_realizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_participantes INTEGER NOT NULL,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sorteios_realizados ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Admins e moderadores podem ver sorteios realizados"
ON public.sorteios_realizados
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins e moderadores podem inserir sorteios realizados"
ON public.sorteios_realizados
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Índice para melhor performance nas consultas
CREATE INDEX idx_sorteios_realizados_data_fim ON public.sorteios_realizados(data_fim);
CREATE INDEX idx_sorteios_realizados_is_test ON public.sorteios_realizados(is_test);