-- Criar tabela para prêmios sorteados
CREATE TABLE public.premios_sorteados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  premio_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  ordem_original integer NOT NULL,
  sorteado_em timestamptz NOT NULL DEFAULT now(),
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_premios_sorteados_premio_id ON public.premios_sorteados(premio_id);
CREATE INDEX idx_premios_sorteados_sorteado_em ON public.premios_sorteados(sorteado_em);
CREATE INDEX idx_premios_sorteados_is_test ON public.premios_sorteados(is_test);

-- Habilitar RLS
ALTER TABLE public.premios_sorteados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para premios_sorteados
CREATE POLICY "Admins e moderadores podem ver premios sorteados"
  ON public.premios_sorteados
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins e moderadores podem inserir premios sorteados"
  ON public.premios_sorteados
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Apenas admins podem deletar premios sorteados"
  ON public.premios_sorteados
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrar prêmios com status 'Sorteado' para a nova tabela
INSERT INTO public.premios_sorteados (premio_id, nome, descricao, ordem_original, is_test, created_at)
SELECT id, nome, descricao, ordem, is_test, created_at
FROM public.premios
WHERE status = 'Sorteado';

-- Remover prêmios sorteados da tabela original
DELETE FROM public.premios WHERE status = 'Sorteado';

-- Remover o status 'Sorteado' da constraint
ALTER TABLE public.premios
DROP CONSTRAINT IF EXISTS premios_status_check;

ALTER TABLE public.premios
ADD CONSTRAINT premios_status_check 
CHECK (status IN ('Disponível', 'Reprogramado', 'Cancelado'));