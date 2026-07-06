// DigiFriend — Edge Function: member self-books a call
// Deploy: supabase functions deploy book-call
// Called by booking.html after member picks a date/time

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY    = Deno.env.get('RESEND_API_KEY')!

async function sendEmail(to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'DigiFriend <calls@digifriend.com>', to, subject, html }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, authorization',
    }})
  }

  // Verify member is logged in
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } }
  })

  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Get the logged-in user
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })

  const meta = user.user_metadata || {}
  if (!meta.matched) return new Response(JSON.stringify({ error: 'Not matched yet' }), { status: 403 })

  const { scheduled_at, duration_minutes, weekly_day, weekly_hour } = await req.json()
  if (!scheduled_at) return new Response(JSON.stringify({ error: 'Missing scheduled_at' }), { status: 400 })

  // Create call record
  const { data: call, error: callErr } = await sbAdmin
    .from('calls')
    .insert({
      member_id: user.id,
      friend_name: meta.friend_name,
      friend_flag: meta.friend_flag || '🌍',
      scheduled_at,
      duration_minutes: duration_minutes || 60,
    })
    .select()
    .single()

  if (callErr) return new Response(JSON.stringify({ error: callErr.message }), { status: 500 })

  // Store weekly recurring schedule on user so cron can auto-create future calls
  if (weekly_day !== undefined && weekly_hour !== undefined) {
    await sbAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...meta, weekly_day, weekly_hour }
    })
  }

  const jitsiUrl  = `https://meet.jit.si/${call.jitsi_room}`
  const callTime  = new Date(call.scheduled_at)
  const firstName = meta.first_name || user.email?.split('@')[0] || 'there'
  const friendFirstName = (meta.friend_name || 'your DigiFriend').split(' ')[0]

  const fmtDate = callTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtTime = callTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

  const callHtml = (name: string, otherName: string) => `
    <div style="font-family:sans-serif; max-width:480px; margin:0 auto; padding:32px 24px;">
      <h2 style="color:#1a2744; margin-bottom:8px;">Your call is confirmed, ${name} 🎉</h2>
      <p style="color:#4a5a7a; line-height:1.6; margin-bottom:24px;">
        You have a weekly call booked with <strong>${otherName}</strong>.
      </p>
      <div style="background:#f0f2f7; border-radius:14px; padding:20px; margin-bottom:24px;">
        <div style="font-size:0.85rem; color:#4a5a7a; margin-bottom:6px;">📅 ${fmtDate}</div>
        <div style="font-size:0.85rem; color:#4a5a7a; margin-bottom:6px;">🕔 ${fmtTime} UTC</div>
        <div style="font-size:0.85rem; color:#4a5a7a;">⏱ ${call.duration_minutes} minutes</div>
      </div>
      <a href="${jitsiUrl}" style="background:#00c9a7; color:#1a2744; font-weight:700; padding:14px 28px; border-radius:12px; text-decoration:none; display:inline-block; margin-bottom:24px;">
        Join call 🎥
      </a>
      <p style="color:#8a98b8; font-size:0.82rem; line-height:1.6;">
        You'll also receive a reminder email 1 hour before the call with this same link.
      </p>
      <hr style="border:none; border-top:1px solid #e2e7f0; margin:24px 0;">
      <p style="color:#8a98b8; font-size:0.8rem;">DigiFriend · digifriend.com</p>
    </div>`

  // Email the member
  await sendEmail(user.email!, `Your call with ${meta.friend_name} is confirmed 🎉`, callHtml(firstName, meta.friend_name))

  // Email the DigiFriend if their email is stored
  if (meta.friend_email) {
    await sendEmail(meta.friend_email, `Your call with ${firstName} is confirmed 🎉`, callHtml(friendFirstName, firstName))
  }

  return new Response(JSON.stringify({ success: true, call, jitsi_url: jitsiUrl }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
})
