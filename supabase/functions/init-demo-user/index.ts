import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Créer le compte de démonstration
    const { data: user, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: 'demo@plusdebulles.com',
      password: 'demo123',
      email_confirm: true
    })

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw signUpError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compte de démonstration créé avec succès',
        user: user?.user?.email 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})