-- Create a SECURITY DEFINER function to check if form is open (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.is_form_open()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.formulario_config WHERE aberto = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_form_open() TO anon, authenticated;

-- Update INSERT policy on participantes to use the function
DROP POLICY IF EXISTS "Todos podem inserir participantes quando formulário aberto" ON public.participantes;
CREATE POLICY "Todos podem inserir participantes quando formulário aberto"
ON public.participantes
FOR INSERT
WITH CHECK (public.is_form_open());