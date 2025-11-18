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

    // Extract client IP from request headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    console.log('Checking rate limit for IP:', clientIP)

    // Check submissions from this IP in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: recentSubmissions, error } = await supabaseClient
      .from('participantes')
      .select('id, created_at')
      .eq('ip', clientIP)
      .gte('created_at', oneHourAgo)

    if (error) {
      console.error('Error checking rate limit:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to check rate limit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const submissionCount = recentSubmissions?.length || 0
    const maxSubmissionsPerHour = 3 // Limit to 3 submissions per hour per IP

    if (submissionCount >= maxSubmissionsPerHour) {
      return new Response(
        JSON.stringify({ 
          allowed: false,
          count: submissionCount,
          limit: maxSubmissionsPerHour,
          message: 'Rate limit exceeded. Please try again later.'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        allowed: true,
        count: submissionCount,
        limit: maxSubmissionsPerHour,
        ip: clientIP // Return IP for debugging
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
