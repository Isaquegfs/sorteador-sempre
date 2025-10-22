-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job cron que verifica o fechamento do formulário a cada minuto
SELECT cron.schedule(
  'check-form-schedule-job',
  '* * * * *', -- Executar a cada minuto
  $$
  SELECT
    net.http_post(
        url:='https://qfppuqzodqclonpkmhgk.supabase.co/functions/v1/check-form-schedule',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcHB1cXpvZHFjbG9ucGttaGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDMwNDIsImV4cCI6MjA3NjE3OTA0Mn0.rtBx0jmvrBUNnfGdoRrNbSPcwU4OU4DwNw1QJ5OLQBw"}'::jsonb
    ) as request_id;
  $$
);