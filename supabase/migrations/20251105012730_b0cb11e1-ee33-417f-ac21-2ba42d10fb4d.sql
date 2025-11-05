-- Adicionar coluna para cor do título SORTEADOR na tabela temas
ALTER TABLE public.temas 
ADD COLUMN cor_titulo text DEFAULT '#0033A1';