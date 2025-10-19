-- Função segura para checar elegibilidade de CPF via hash (bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_cpf_elegivel(cpf_hash_input text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.base_oficial WHERE cpf_hash = cpf_hash_input
  );
$$;

-- Garantir permissão de execução para clientes
GRANT EXECUTE ON FUNCTION public.is_cpf_elegivel(text) TO anon, authenticated;