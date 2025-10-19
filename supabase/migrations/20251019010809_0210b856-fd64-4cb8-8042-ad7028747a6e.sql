-- Recriar a view sem SECURITY DEFINER
DROP VIEW IF EXISTS public.formulario_status;

CREATE VIEW public.formulario_status AS
SELECT id, aberto FROM public.formulario_config;