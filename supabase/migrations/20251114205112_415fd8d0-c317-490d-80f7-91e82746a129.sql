-- Remover políticas antigas de SELECT na tabela user_roles
DROP POLICY IF EXISTS "Usuários podem ver suas próprias roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins e moderadores podem ver todas as roles" ON public.user_roles;

-- Criar política para admins e moderadores verem todas as roles
CREATE POLICY "Admins e moderadores podem ver todas as roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Criar política para usuários verem suas próprias roles
CREATE POLICY "Usuários podem ver suas próprias roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);