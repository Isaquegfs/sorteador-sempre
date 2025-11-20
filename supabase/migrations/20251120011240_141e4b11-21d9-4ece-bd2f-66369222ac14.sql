-- Add server-side CPF validation function
CREATE OR REPLACE FUNCTION public.validate_cpf_format(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  numbers text;
  sum_val integer;
  digit integer;
  i integer;
BEGIN
  -- Remove non-numeric characters
  numbers := regexp_replace(cpf_input, '\D', '', 'g');
  
  -- Check if has exactly 11 digits
  IF length(numbers) != 11 THEN
    RETURN false;
  END IF;
  
  -- Check if all digits are the same (invalid CPF)
  IF numbers ~ '^(\d)\1+$' THEN
    RETURN false;
  END IF;
  
  -- Validate first check digit
  sum_val := 0;
  FOR i IN 1..9 LOOP
    sum_val := sum_val + (substring(numbers, i, 1)::integer * (11 - i));
  END LOOP;
  
  digit := 11 - (sum_val % 11);
  IF digit >= 10 THEN
    digit := 0;
  END IF;
  
  IF digit != substring(numbers, 10, 1)::integer THEN
    RETURN false;
  END IF;
  
  -- Validate second check digit
  sum_val := 0;
  FOR i IN 1..10 LOOP
    sum_val := sum_val + (substring(numbers, i, 1)::integer * (12 - i));
  END LOOP;
  
  digit := 11 - (sum_val % 11);
  IF digit >= 10 THEN
    digit := 0;
  END IF;
  
  IF digit != substring(numbers, 11, 1)::integer THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Add validation function for CPF hash format
CREATE OR REPLACE FUNCTION public.validate_cpf_hash(hash text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Verify hash is valid SHA-256 (64 hex characters)
  RETURN hash ~ '^[a-f0-9]{64}$';
END;
$$;

-- Create trigger function to validate CPF before insertion
CREATE OR REPLACE FUNCTION public.validate_cpf_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate CPF hash format
  IF NOT validate_cpf_hash(NEW.cpf_hash) THEN
    RAISE EXCEPTION 'Invalid CPF hash format';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to participantes table
DROP TRIGGER IF EXISTS validate_cpf_trigger ON public.participantes;
CREATE TRIGGER validate_cpf_trigger
  BEFORE INSERT ON public.participantes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cpf_on_insert();

-- Add trigger to base_oficial table
DROP TRIGGER IF EXISTS validate_cpf_trigger_base ON public.base_oficial;
CREATE TRIGGER validate_cpf_trigger_base
  BEFORE INSERT ON public.base_oficial
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cpf_on_insert();