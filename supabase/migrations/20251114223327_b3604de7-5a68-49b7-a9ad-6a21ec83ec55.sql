-- Criação da tabela de prêmios
CREATE TABLE public.premios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'Disponível',
  ordem integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premios_status_check CHECK (status IN ('Disponível', 'Sorteado', 'Reprogramado', 'Cancelado')),
  CONSTRAINT premios_ordem_unique UNIQUE (ordem)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_premios_updated_at
  BEFORE UPDATE ON public.premios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.premios ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "Admins e moderadores podem ver premios" 
ON public.premios 
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Policy para INSERT
CREATE POLICY "Admins e moderadores podem inserir premios" 
ON public.premios 
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Policy para UPDATE
CREATE POLICY "Admins e moderadores podem atualizar premios" 
ON public.premios 
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Policy para DELETE
CREATE POLICY "Apenas admins podem deletar premios" 
ON public.premios 
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para performance
CREATE INDEX idx_premios_ordem ON public.premios(ordem);
CREATE INDEX idx_premios_status ON public.premios(status);