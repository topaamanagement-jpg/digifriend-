// DigiFriend — Edge Function: send call reminder emails via Resend
// Runs every 5 minutes via cron (see supabase-cron-setup.sql).
// Sends a reminder ~1 hour before each confirmed call — to the member
// AND to the DigiFriend, each in their own timezone.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FROM_EMAIL = 'DigiFriend <hello@digifriend.app>'

const fmtTime = (d: Date, tz?: string | null) => {
  try {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'UTC' })
  } catch {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  }
}

const emailHtml = (name: string, timeStr: string, otherName: string, jitsiUrl: string) => `
<!DOCTYPE html><html><body style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2744;background:#f4f6fb;margin:0;padding:40px 16px;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(26,39,68,0.08);">
  <div style="background:#1a2744;padding:32px 36px;">
    <span style="font-size:1.3rem;font-weight:800;color:#ffffff;">Digi<span style="color:#00c9a7;">Friend</span></span>
  </div>
  <div style="padding:36px;">
    <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 12px;">Your call starts in 1 hour 🎥</h2>
    <p style="color:#4a5a7a;line-height:1.7;margin:0 0 20px;">Hi ${name} — your call with <strong>${otherName}</strong> starts at <strong>${timeStr}</strong> (your time).</p>
    <a href="${jitsiUrl}" style="display:inline-block;background:#00c9a7;color:#1a2744;font-weight:700;font-size:0.9rem;padding:13px 28px;border-radius:50px;text-decoration:none;">Join the call →</a>
  </div>
</div>
</body></html>`

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
  })
  return res.ok
}

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Confirmed calls starting in 55–65 minutes, no reminder sent yet
  const now  = new Date()
  const from = new Date(now.getTime() + 55 * 60 * 1000)
  const to   = new Date(now.getTime() + 65 * 60 * 1000)

  const { data: calls, error } = await sb
    .from('calls')
    .select('*')
    .eq('reminder_sent', false)
    .eq('status', 'confirmed')
    .gte('scheduled_at', from.toISOString())
    .lte('scheduled_at', to.toISOString())

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!calls || calls.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 })

  const results = []
  for (const call of calls) {
    const callTime = new Date(call.scheduled_at)
    const jitsiUrl = `https://meet.jit.si/${call.jitsi_room}`

    // Member reminder (their timezone)
    let memberOk = false
    if (call.member_email) {
      memberOk = await sendEmail(
        call.member_email,
        `Reminder: your call with ${call.friend_name || 'your DigiFriend'} starts in 1 hour`,
        emailHtml(
          (call.member_name || '').split(' ')[0] || 'there',
          fmtTime(callTime, call.member_timezone),
          call.friend_name || 'your DigiFriend',
          jitsiUrl
        )
      )
    }

    // DigiFriend reminder (their timezone)
    let dfOk = false
    if (call.digifriend_id) {
      const { data: dfRows } = await sb
        .from('digifriends')
        .select('email, name, timezone')
        .eq('id', call.digifriend_id)
        .limit(1)
      const df = dfRows?.[0]
      if (df?.email) {
        dfOk = await sendEmail(
          df.email,
          `Reminder: your call with ${call.member_name || 'a member'} starts in 1 hour`,
          emailHtml(
            (df.name || '').split(' ')[0] || 'there',
            fmtTime(callTime, df.timezone),
            call.member_name || 'your member',
            jitsiUrl
          )
        )
      }
    }

    // Mark as sent so the next cron run doesn't repeat it
    await sb.from('calls').update({ reminder_sent: true }).eq('id', call.id)
    results.push({ id: call.id, member: memberOk, digifriend: dfOk })
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
