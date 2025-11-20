-- Fix search_path for validate_cpf_format function
CREATE OR REPLACE FUNCTION public.validate_cpf_format(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
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

-- Fix search_path for validate_cpf_hash function
CREATE OR REPLACE FUNCTION public.validate_cpf_hash(hash text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Verify hash is valid SHA-256 (64 hex characters)
  RETURN hash ~ '^[a-f0-9]{64}$';
END;
$$;