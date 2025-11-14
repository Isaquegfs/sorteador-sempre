-- Remover a política antiga que só permite ver o próprio perfil
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;

-- Criar nova política que permite admins e moderadores verem todos os perfis
CREATE POLICY "Admins e moderadores podem ver todos os perfis"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Criar política para usuários verem seu próprio perfil (caso não sejam admin/moderador)
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);