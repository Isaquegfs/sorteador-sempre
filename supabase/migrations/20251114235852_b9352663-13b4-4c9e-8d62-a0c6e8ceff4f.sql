-- Adicionar política para admins e moderadores verem todos os temas
CREATE POLICY "Admins e moderadores podem ver todos os temas"
ON public.temas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);