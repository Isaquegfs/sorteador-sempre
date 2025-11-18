-- Criar tabela para histórico de ações administrativas
CREATE TABLE public.historico_acoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  usuario_nome TEXT NOT NULL,
  acao TEXT NOT NULL,
  detalhes TEXT,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Admins e moderadores podem ver histórico"
ON public.historico_acoes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins e moderadores podem inserir histórico"
ON public.historico_acoes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Índices para melhor performance
CREATE INDEX idx_historico_acoes_created_at ON public.historico_acoes(created_at DESC);
CREATE INDEX idx_historico_acoes_usuario_id ON public.historico_acoes(usuario_id);
CREATE INDEX idx_historico_acoes_is_test ON public.historico_acoes(is_test);