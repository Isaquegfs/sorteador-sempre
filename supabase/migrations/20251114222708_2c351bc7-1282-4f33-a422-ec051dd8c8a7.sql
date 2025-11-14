-- Security improvement: Restrict public theme access to active theme only
-- This prevents exposure of inactive/draft themes while maintaining functionality

DROP POLICY IF EXISTS "Todos podem ver temas" ON public.temas;

CREATE POLICY "Public can view active theme only" 
ON public.temas 
FOR SELECT 
USING (ativo = true);