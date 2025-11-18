-- Função para buscar setor e cidade da base oficial
CREATE OR REPLACE FUNCTION public.get_dados_base_oficial(cpf_hash_input text)
RETURNS TABLE(setor text, cidade text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor, cidade 
  FROM public.base_oficial 
  WHERE cpf_hash = cpf_hash_input
  LIMIT 1;
$$;