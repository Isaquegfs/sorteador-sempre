-- Adicionar constraints de tamanho (apenas se ainda não existirem)
DO $$ 
BEGIN
  -- Participantes
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participantes_nome_length') THEN
    ALTER TABLE public.participantes ADD CONSTRAINT participantes_nome_length CHECK (length(nome) <= 200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participantes_email_length') THEN
    ALTER TABLE public.participantes ADD CONSTRAINT participantes_email_length CHECK (length(email) <= 255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participantes_setor_length') THEN
    ALTER TABLE public.participantes ADD CONSTRAINT participantes_setor_length CHECK (length(setor) <= 200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participantes_cidade_length') THEN
    ALTER TABLE public.participantes ADD CONSTRAINT participantes_cidade_length CHECK (length(cidade) <= 200);
  END IF;

  -- Base oficial
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'base_oficial_nome_length') THEN
    ALTER TABLE public.base_oficial ADD CONSTRAINT base_oficial_nome_length CHECK (length(nome) <= 200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'base_oficial_email_length') THEN
    ALTER TABLE public.base_oficial ADD CONSTRAINT base_oficial_email_length CHECK (length(email) <= 255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'base_oficial_setor_length') THEN
    ALTER TABLE public.base_oficial ADD CONSTRAINT base_oficial_setor_length CHECK (length(setor) <= 200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'base_oficial_cidade_length') THEN
    ALTER TABLE public.base_oficial ADD CONSTRAINT base_oficial_cidade_length CHECK (length(cidade) <= 200);
  END IF;
END $$;