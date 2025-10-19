-- Adicionar políticas RLS faltantes para profiles
CREATE POLICY "Usuários podem inserir seu próprio perfil"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Adicionar políticas para base_oficial
CREATE POLICY "Admins podem atualizar base oficial"
ON public.base_oficial FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar base oficial"
ON public.base_oficial FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar políticas para sorteados
CREATE POLICY "Admins e moderadores podem atualizar sorteados"
ON public.sorteados FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Apenas admins podem deletar sorteados"
ON public.sorteados FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Melhorar políticas de sistema_config
DROP POLICY IF EXISTS "Apenas admins podem acessar config do sistema" ON public.sistema_config;

CREATE POLICY "Admins podem ver config do sistema"
ON public.sistema_config FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir config do sistema"
ON public.sistema_config FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar config do sistema"
ON public.sistema_config FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar config do sistema"
ON public.sistema_config FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar view pública para formulario_config (apenas status)
CREATE OR REPLACE VIEW public.formulario_status AS
SELECT id, aberto FROM public.formulario_config;

-- Restringir acesso completo à tabela formulario_config apenas para admins
DROP POLICY IF EXISTS "Todos podem ver config do formulário" ON public.formulario_config;

CREATE POLICY "Todos podem ver status do formulário via view"
ON public.formulario_config FOR SELECT
USING (true);

-- Adicionar constraints de tamanho nos campos de participantes
ALTER TABLE public.participantes
ADD CONSTRAINT participantes_nome_length CHECK (length(nome) <= 200),
ADD CONSTRAINT participantes_email_length CHECK (length(email) <= 255),
ADD CONSTRAINT participantes_setor_length CHECK (length(setor) <= 200),
ADD CONSTRAINT participantes_cidade_length CHECK (length(cidade) <= 200);

-- Adicionar constraints de tamanho nos campos de base_oficial
ALTER TABLE public.base_oficial
ADD CONSTRAINT base_oficial_nome_length CHECK (length(nome) <= 200),
ADD CONSTRAINT base_oficial_email_length CHECK (length(email) <= 255),
ADD CONSTRAINT base_oficial_setor_length CHECK (length(setor) <= 200),
ADD CONSTRAINT base_oficial_cidade_length CHECK (length(cidade) <= 200);