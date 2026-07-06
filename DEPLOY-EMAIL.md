# Deploy email notifications — 3 steps

## Step 1 — Create a free Resend account

1. Go to https://resend.com and sign up (free: 100 emails/day)
2. Click **API Keys** in the sidebar → **Create API key**
3. Copy the key (starts with `re_...`)

---

## Step 2 — Add the key to Supabase

1. Go to your Supabase project → **Edge Functions** in the sidebar
2. Click **Manage secrets**
3. Add a new secret:
   - Name:  `RESEND_API_KEY`
   - Value: `re_your_key_here`
4. Save

---

## Step 3 — Deploy the function

You need the Supabase CLI installed. Run these commands in your terminal from the `digifriend` folder:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to your project (get the project ref from Supabase Dashboard → Settings → General)
supabase link --project-ref ciomvjbqilosttyotmcg

# Deploy the function
supabase functions deploy send-email
```

That's it. Emails will now be sent automatically when:
- A member requests a booking → DigiFriend gets an email
- DigiFriend approves → Member gets a confirmation email
- DigiFriend declines → Member gets a decline email
- Either party cancels → Both get a cancellation email

---

## Note on sender email

The function currently sends from `hello@digifriend.com`.
In Resend, you need to verify a domain before sending from a custom address.
Until then, you can use `onboarding@resend.dev` for testing — just change the `FROM_EMAIL`
line in `supabase/functions/send-email/index.ts`.
