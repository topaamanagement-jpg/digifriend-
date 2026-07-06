// DigiFriend — Edge Function: invite an approved DigiFriend by email
// Sends a Supabase invite email with a link to set-password.html.
// Guard: only emails that already exist in the digifriends table can be invited,
// so this cannot be abused to invite arbitrary users.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL     = 'https://digifriend.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email } = await req.json()
    if (!email) throw new Error('Missing email')

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Guard: the email must belong to an approved DigiFriend profile
    const { data: dfRows, error: dfErr } = await sb
      .from('digifriends')
      .select('id, name')
      .eq('email', email)
      .limit(1)
    if (dfErr) throw dfErr
    if (!dfRows || dfRows.length === 0) {
      return new Response(JSON.stringify({ error: 'No DigiFriend profile with that email' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${SITE_URL}/set-password.html`,
      data: { first_name: (dfRows[0].name || '').split(' ')[0], is_digifriend: true }
    })

    if (inviteErr) {
      // Already registered → they can simply log in
      const already = /already/i.test(inviteErr.message)
      return new Response(JSON.stringify({ error: inviteErr.message, already_registered: already }), {
        status: already ? 409 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
