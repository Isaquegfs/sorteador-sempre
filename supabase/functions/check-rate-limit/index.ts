import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Extract CPF hash from request body
    const { cpf_hash } = await req.json()

    if (!cpf_hash) {
      console.error('Missing cpf_hash in request body')
      return new Response(
        JSON.stringify({ error: 'CPF hash is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking rate limit for CPF hash:', cpf_hash.substring(0, 8) + '...')

    // Check submissions from this CPF in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: recentSubmissions, error } = await supabaseClient
      .from('participantes')
      .select('id, created_at')
      .eq('cpf_hash', cpf_hash)
      .gte('created_at', oneHourAgo)

    if (error) {
      console.error('Error checking rate limit:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to check rate limit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const submissionCount = recentSubmissions?.length || 0
    const maxSubmissionsPerHour = 3 // Limit to 3 submissions per hour per CPF

    if (submissionCount >= maxSubmissionsPerHour) {
      console.log(`Rate limit exceeded for CPF hash: ${submissionCount}/${maxSubmissionsPerHour} attempts`)
      return new Response(
        JSON.stringify({ 
          allowed: false,
          count: submissionCount,
          limit: maxSubmissionsPerHour,
          message: 'Você já tentou se cadastrar recentemente com este CPF. Aguarde alguns minutos e tente novamente.'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Rate limit OK: ${submissionCount}/${maxSubmissionsPerHour} attempts`)
    return new Response(
      JSON.stringify({ 
        allowed: true,
        count: submissionCount,
        limit: maxSubmissionsPerHour
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
