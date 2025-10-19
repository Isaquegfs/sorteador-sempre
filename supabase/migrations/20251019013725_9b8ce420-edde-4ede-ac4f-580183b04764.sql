-- Restringir acesso à tabela formulario_config apenas para admins
DROP POLICY IF EXISTS "Todos podem ver status do formulário via view" ON public.formulario_config;

CREATE POLICY "Apenas admins podem ver formulario_config completo"
ON public.formulario_config FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));