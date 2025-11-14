-- Fix security issue: Add search_path to functions missing it
-- This prevents potential privilege escalation attacks

-- Update the update_updated_at_column function to include search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update the set_tema_ativo function to include search_path
CREATE OR REPLACE FUNCTION public.set_tema_ativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.ativo = true THEN
    UPDATE public.temas
    SET ativo = false
    WHERE id != NEW.id AND ativo = true;
  END IF;
  RETURN NEW;
END;
$function$;