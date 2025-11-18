-- Create function to capture client IP from Supabase request context
CREATE OR REPLACE FUNCTION public.capture_client_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Capture the client IP from Supabase's request context
  -- This uses the current_setting to get the request IP from the JWT or connection
  IF NEW.ip IS NULL OR NEW.ip = 'client' THEN
    BEGIN
      NEW.ip := current_setting('request.headers', true)::json->>'x-real-ip';
    EXCEPTION
      WHEN OTHERS THEN
        -- If we can't get the IP, use a placeholder
        NEW.ip := 'unknown';
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically capture IP on participant insert
DROP TRIGGER IF EXISTS capture_participant_ip ON public.participantes;
CREATE TRIGGER capture_participant_ip
  BEFORE INSERT ON public.participantes
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_client_ip();