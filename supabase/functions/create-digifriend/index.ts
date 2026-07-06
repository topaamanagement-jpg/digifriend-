// DigiFriend — Edge Function: create or update a DigiFriend profile
// Deploy: supabase functions deploy create-digifriend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_SECRET  = Deno.env.get('ADMIN_SECRET')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, x-admin-secret',
    }})
  }

  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const body = await req.json()

  // Upsert by email so re-submitting updates instead of duplicating
  const { data, error } = await sb
    .from('digifriends')
    .upsert(body, { onConflict: 'email' })
    .select()
    .single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ success: true, digifriend: data }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
})
