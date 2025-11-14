-- Adicionar campo sorteio_com_premios na tabela sistema_config
ALTER TABLE public.sistema_config 
ADD COLUMN sorteio_com_premios boolean DEFAULT false;

-- Adicionar campo premio_id na tabela sorteados (referência para prêmios)
ALTER TABLE public.sorteados 
ADD COLUMN premio_id uuid REFERENCES public.premios(id) ON DELETE SET NULL;