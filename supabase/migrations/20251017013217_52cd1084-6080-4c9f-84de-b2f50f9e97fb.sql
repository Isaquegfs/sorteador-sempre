-- Criar enum para tipos de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Criar tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Tabela da base oficial (validação de CPF)
CREATE TABLE public.base_oficial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  setor TEXT NOT NULL,
  cidade TEXT NOT NULL,
  cpf_hash TEXT NOT NULL UNIQUE,
  cpf_censurado TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.base_oficial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins e moderadores podem ver base oficial"
  ON public.base_oficial FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Apenas admins podem inserir na base oficial"
  ON public.base_oficial FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tabela de configuração do formulário
CREATE TABLE public.formulario_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aberto BOOLEAN NOT NULL DEFAULT FALSE,
  data_abertura TIMESTAMPTZ,
  data_fechamento TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.formulario_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver config do formulário"
  ON public.formulario_config FOR SELECT
  USING (TRUE);

CREATE POLICY "Apenas admins podem atualizar config"
  ON public.formulario_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserir config inicial
INSERT INTO public.formulario_config (aberto) VALUES (FALSE);

-- Tabela temporária de participantes
CREATE TABLE public.participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  setor TEXT NOT NULL,
  cidade TEXT NOT NULL,
  cpf_censurado TEXT NOT NULL UNIQUE,
  cpf_hash TEXT NOT NULL UNIQUE,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem inserir participantes quando formulário aberto"
  ON public.participantes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formulario_config 
      WHERE aberto = TRUE
    )
  );

CREATE POLICY "Admins e moderadores podem ver participantes"
  ON public.participantes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Apenas admins podem deletar participantes"
  ON public.participantes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Tabela de sorteados
CREATE TABLE public.sorteados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  setor TEXT NOT NULL,
  cidade TEXT NOT NULL,
  sorteado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sorteado_por UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.sorteados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e moderadores podem ver sorteados"
  ON public.sorteados FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Admins e moderadores podem inserir sorteados"
  ON public.sorteados FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'moderator')
  );

-- Tabela de configurações do sistema
CREATE TABLE public.sistema_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senha_criptografia_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sistema_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem acessar config do sistema"
  ON public.sistema_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserir config inicial
INSERT INTO public.sistema_config (senha_criptografia_hash) VALUES (NULL);

-- Trigger para atualizar perfil quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();