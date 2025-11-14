-- Adicionar coluna para controlar exibição do contador independentemente do modo prêmios
ALTER TABLE public.sistema_config
ADD COLUMN ativar_contador_tempo boolean DEFAULT false;