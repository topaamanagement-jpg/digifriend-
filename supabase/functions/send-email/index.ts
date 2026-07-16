import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = 'DigiFriend <hello@digifriend.app>'
const SITE_URL       = 'https://digifriend.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { type, to, data } = await req.json()
    // type: 'booking_requested' | 'booking_confirmed' | 'booking_declined' | 'booking_cancelled'
    // to:   email address of recipient
    // data: { member_name, df_name, date_str, time_str, is_recurring }

    const subject = subjects[type]?.(data) ?? 'DigiFriend notification'
    const html    = bodies[type]?.(data)   ?? '<p>You have a new notification from DigiFriend.</p>'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
    })

    const resData = await res.json()
    if (!res.ok) throw new Error(resData.message || 'Resend error')

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// ── Subject lines ─────────────────────────────────────────────────────
const subjects: Record<string, (d: any) => string> = {
  booking_requested: d => `${d.member_name} wants to book a call with you`,
  booking_confirmed: d => `✅ Your call with ${d.df_name} is confirmed`,
  booking_declined:  d => `Call request with ${d.df_name} was declined`,
  booking_cancelled: d => `Call cancelled - ${d.date_str}`,
  member_matched:    d => `You've been matched with ${d.df_name}! 🎉`,
}

// ── Email bodies ──────────────────────────────────────────────────────
const wrap = (content: string) => `
<!DOCTYPE html><html><body style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2744;background:#f4f6fb;margin:0;padding:40px 16px;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(26,39,68,0.08);">
  <div style="background:#1a2744;padding:32px 36px;">
    <span style="font-size:1.3rem;font-weight:800;color:#ffffff;">Digi<span style="color:#00c9a7;">Friend</span></span>
  </div>
  <div style="padding:36px;">
    ${content}
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #eef0f5;font-size:0.78rem;color:#8a98b8;line-height:1.6;">
      You received this email because you have an account at DigiFriend.<br>
      <a href="${SITE_URL}" style="color:#00a88c;">Visit DigiFriend →</a>
    </div>
  </div>
</div>
</body></html>`

const btn = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;background:#00c9a7;color:#1a2744;font-weight:700;font-size:0.9rem;padding:13px 28px;border-radius:50px;text-decoration:none;margin-top:20px;">${label}</a>`

const bodies: Record<string, (d: any) => string> = {
  booking_requested: d => wrap(`
    <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">New booking request 🔔</h2>
    <p style="color:#4a5a7a;line-height:1.7;margin:0 0 20px;"><strong>${d.member_name}</strong> has requested a call with you.</p>
    <div style="background:#f4f6fb;border-radius:14px;padding:18px 20px;">
      <div style="margin-bottom:8px;">📅 <strong>${d.date_str}</strong></div>
      <div style="margin-bottom:8px;">🕐 <strong>${d.time_str}</strong> (your time)</div>
      ${d.is_recurring ? '<div>🔁 <strong>Weekly recurring</strong></div>' : '<div>📌 One-time call</div>'}
    </div>
    <p style="color:#4a5a7a;font-size:0.88rem;margin-top:16px;">Log in to accept or decline the request.</p>
    ${btn(`${SITE_URL}/digifriend-portal.html`, 'Review request →')}
  `),
  booking_confirmed: d => wrap(`
    <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">Your call is confirmed ✅</h2>
    <p style="color:#4a5a7a;line-height:1.7;margin:0 0 20px;"><strong>${d.df_name}</strong> accepted your booking request.</p>
    <div style="background:#e6faf7;border:1.5px solid #00c9a7;border-radius:14px;padding:18px 20px;">
      <div style="margin-bottom:8px;">📅 <strong>${d.date_str}</strong></div>
      <div style="margin-bottom:8px;">🕐 <strong>${d.time_str}</strong> (your time)</div>
      ${d.is_recurring ? '<div>🔁 <strong>Repeats weekly</strong> - same time every week</div>' : '<div>📌 One-time call</div>'}
      ${d.join_url ? `<div style="margin-top:8px;">🎥 Video link: <a href="${d.join_url}" style="color:#00a88c;font-weight:700;">${d.join_url}</a></div>` : ''}
    </div>
    ${d.join_url ? btn(d.join_url, 'Join video call 🎥') : ''}
    ${btn(`${SITE_URL}/booking.html`, 'View my calls →')}
  `),
  booking_declined: d => wrap(`
    <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">Booking request declined</h2>
    <p style="color:#4a5a7a;line-height:1.7;margin:0 0 20px;">Unfortunately, <strong>${d.df_name}</strong> is not available for the time you requested.</p>
    <p style="color:#4a5a7a;font-size:0.88rem;">No worries - you can pick a different time from their available slots.</p>
    ${btn(`${SITE_URL}/booking.html`, 'Choose another time →')}
  `),
  booking_cancelled: d => wrap(`
    <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">Call cancelled</h2>
    <p style="color:#4a5a7a;line-height:1.7;margin:0 0 20px;">The call on <strong>${d.date_str}</strong> at <strong>${d.time_str}</strong> has been cancelled by ${d.cancelled_by === 'member' ? 'the member' : 'your DigiFriend'}.</p>
    ${btn(`${SITE_URL}/booking.html`, 'View my calls →')}
  `),
  member_matched: d => wrap(`
    <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">You've been matched! 🎉</h2>
    <p style="color:#4a5a7a;line-height:1.7;margin:0 0 20px;">Hi ${d.member_name || 'there'}, we've matched you with <strong>${d.df_name}</strong>, your DigiFriend for weekly conversations.</p>
    <p style="color:#4a5a7a;font-size:0.88rem;margin-bottom:16px;">Log in to see their profile, pick a time that works for you, and book your first call.</p>
    ${btn(`${SITE_URL}/booking.html`, 'Book your first call →')}
  `),
}
