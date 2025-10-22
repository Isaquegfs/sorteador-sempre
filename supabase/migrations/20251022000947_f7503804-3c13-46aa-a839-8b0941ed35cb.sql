-- Criar função para atualizar updated_at (caso não exista)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar bucket para imagens de temas
INSERT INTO storage.buckets (id, name, public)
VALUES ('temas', 'temas', true)
ON CONFLICT (id) DO NOTHING;

-- Criar tabela de temas
CREATE TABLE public.temas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT NOT NULL,
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY;

-- Políticas para temas
CREATE POLICY "Todos podem ver temas"
ON public.temas
FOR SELECT
USING (true);

CREATE POLICY "Admins podem criar temas"
ON public.temas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar temas"
ON public.temas
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar temas"
ON public.temas
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas de storage para temas
CREATE POLICY "Temas são publicamente acessíveis"
ON storage.objects
FOR SELECT
USING (bucket_id = 'temas');

CREATE POLICY "Admins podem fazer upload de temas"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'temas' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins podem atualizar temas"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'temas' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins podem deletar temas"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'temas' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_temas_updated_at
BEFORE UPDATE ON public.temas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para garantir apenas um tema ativo por vez
CREATE OR REPLACE FUNCTION public.set_tema_ativo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ativo = true THEN
    UPDATE public.temas
    SET ativo = false
    WHERE id != NEW.id AND ativo = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_tema
BEFORE INSERT OR UPDATE ON public.temas
FOR EACH ROW
WHEN (NEW.ativo = true)
EXECUTE FUNCTION public.set_tema_ativo();