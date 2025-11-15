import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação via secret token para cron jobs OU Authorization com ANON/SERVICE
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('authorization') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authorized =
      (cronSecret && expectedSecret && cronSecret === expectedSecret) ||
      authHeader === `Bearer ${anonKey}` ||
      authHeader === `Bearer ${serviceKey}`;

    if (!authorized) {
      console.error('Tentativa de acesso não autorizado - credenciais inválidas ou ausentes');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Verificando agendamento de fechamento do formulário...');

    // Buscar configuração do formulário
    const { data: config, error: configError } = await supabaseClient
      .from('formulario_config')
      .select('*')
      .single();

    if (configError) {
      console.error('Erro ao buscar configuração:', configError);
      throw configError;
    }

    if (!config) {
      console.log('Nenhuma configuração encontrada');
      return new Response(
        JSON.stringify({ message: 'Configuração não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verificar se o fechamento automático está ativo
    if (!config.fechamento_automatico_ativo || !config.data_fechamento_agendado) {
      console.log('Fechamento automático não está ativo');
      return new Response(
        JSON.stringify({ message: 'Fechamento automático não está ativo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const now = new Date();
    const scheduledDate = new Date(config.data_fechamento_agendado);

    console.log('Data atual (UTC):', now.toISOString());
    console.log('Data agendada (UTC):', scheduledDate.toISOString());

    // Formatar horários para debug em Brasília
    const formatBrTime = (date: Date) => {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'medium'
      }).format(date);
    };

    const currentTimeBr = formatBrTime(now);
    const scheduledTimeBr = formatBrTime(scheduledDate);
    
    console.log('Data atual (Brasília):', currentTimeBr);
    console.log('Data agendada (Brasília):', scheduledTimeBr);

    // Verificar se chegou o momento de fechar
    if (now >= scheduledDate && config.aberto) {
      console.log('Fechando formulário automaticamente...');

      const { error: updateError } = await supabaseClient
        .from('formulario_config')
        .update({
          aberto: false,
          data_fechamento: now.toISOString(),
          fechamento_automatico_ativo: false,
          updated_at: now.toISOString(),
        })
        .eq('id', config.id);

      if (updateError) {
        console.error('Erro ao fechar formulário:', updateError);
        throw updateError;
      }

      console.log('Formulário fechado automaticamente com sucesso!');

      return new Response(
        JSON.stringify({ 
          message: 'Formulário fechado automaticamente',
          closed_at: now.toISOString(),
          closed_at_br: formatBrTime(now)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Ainda não é hora de fechar o formulário');

    return new Response(
      JSON.stringify({ 
        message: 'Verificação concluída - formulário ainda aberto',
        scheduled_for: scheduledDate.toISOString(),
        scheduled_for_br: scheduledTimeBr,
        current_time: now.toISOString(),
        current_time_br: currentTimeBr
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Erro na verificação:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});