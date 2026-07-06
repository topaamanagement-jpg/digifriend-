// DigiFriend — Edge Function: auto-create next week's call for recurring bookings
// Runs daily via cron (see supabase-cron-setup.sql).
//
// Logic: a recurring series = member + digifriend + day_of_week + hour_local.
// When the latest call in a series is in the past, the next week's call is
// created automatically — even if last week's call was cancelled (cancelling
// only skips that week). The series stops when the latest call has
// is_recurring = false ("stop all future calls") or was declined.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Fetch ALL calls that belong to a weekly series (day_of_week/hour_local set),
  // regardless of their current is_recurring flag. Filtering by is_recurring=true
  // here would hide the "stop all future calls" row (is_recurring=false) and let
  // an older still-recurring row from the same series be picked up as "latest" —
  // which would silently un-cancel a series the member explicitly stopped.
  const { data: calls, error } = await sb
    .from('calls')
    .select('*')
    .not('day_of_week', 'is', null)
    .not('hour_local', 'is', null)
    .order('scheduled_at', { ascending: false })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  // Keep only the latest call per series (member + digifriend + weekly slot)
  const seen = new Set<string>()
  const latest: any[] = []
  for (const c of calls ?? []) {
    const key = `${c.member_id}|${c.digifriend_id}|${c.day_of_week}|${c.hour_local}`
    if (seen.has(key)) continue
    seen.add(key)
    latest.push(c)
  }

  const now = new Date()
  const results: any[] = []

  for (const c of latest) {
    // The latest call must still be marked recurring — if the member stopped
    // the series (is_recurring=false) or the DigiFriend declined, don't renew.
    if (!c.is_recurring) { results.push({ series: c.id, skipped: 'series stopped' }); continue }
    if (c.status !== 'confirmed' && c.status !== 'cancelled') {
      results.push({ series: c.id, skipped: c.status })
      continue
    }

    const last = new Date(c.scheduled_at)
    if (last > now) { results.push({ series: c.id, skipped: 'future call exists' }); continue }

    // Next occurrence: +7 days until it lands in the future.
    // Note: UTC time is kept fixed; local time may shift 1h around DST changes.
    const next = new Date(last)
    while (next <= now) next.setDate(next.getDate() + 7)

    const { error: insErr } = await sb.from('calls').insert({
      member_id:        c.member_id,
      digifriend_id:    c.digifriend_id,
      scheduled_at:     next.toISOString(),
      duration_minutes: c.duration_minutes || 60,
      status:           'confirmed',
      is_recurring:     true,
      day_of_week:      c.day_of_week,
      hour_local:       c.hour_local,
      member_timezone:  c.member_timezone,
      member_name:      c.member_name,
      member_email:     c.member_email,
      friend_name:      c.friend_name,
      friend_flag:      c.friend_flag,
      jitsi_room:       c.jitsi_room, // same video link every week
    })

    results.push({ series: c.id, created: !insErr, next: next.toISOString(), error: insErr?.message })
  }

  return new Response(JSON.stringify({ checked: latest.length, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
