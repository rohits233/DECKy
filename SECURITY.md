# Security Best Practices

## Environment Variables Setup

### Step-by-Step Secure Setup

1. **Create your local environment file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **NEVER commit `.env.local`** - It's already in `.gitignore`

3. **Get your Supabase credentials:**
   - Go to https://supabase.com/dashboard
   - Create a new project or select existing
   - Go to Settings > API
   - Copy `URL` and `anon public` key (safe for client-side)
   - Copy `service_role` key (NEVER expose client-side)

4. **Get your OpenAI API key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new secret key
   - Copy immediately (shown only once)

5. **Fill in `.env.local`** with your actual values

### Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit API keys to git
- [ ] Use `NEXT_PUBLIC_` prefix only for client-safe variables
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` server-side only
- [ ] Rotate keys if accidentally exposed
- [ ] Use Vercel environment variables for production
- [ ] Enable Supabase RLS policies (already in migration)
- [ ] Review git history before pushing: `git log --all --full-history --source -- .env*`

### Vercel Deployment

Add environment variables in Vercel Dashboard:
1. Go to Project Settings > Environment Variables
2. Add each variable separately
3. Select appropriate environments (Production/Preview/Development)
4. Never log or expose these in client-side code

### What's Safe vs Unsafe

**Safe for client-side (NEXT_PUBLIC_):**
- `NEXT_PUBLIC_SUPABASE_URL` - Public URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Protected by RLS policies

**MUST stay server-side only:**
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS, full database access
- `OPENAI_API_KEY` - Costs money per request

### Emergency: Key Leaked?

1. **Immediately revoke** the key in the service dashboard
2. **Generate new key** and update `.env.local`
3. **Update Vercel** environment variables
4. **Check git history**: `git log --all --source -- .env*`
5. If committed, consider the key permanently compromised
6. For GitHub: Use `git filter-branch` or BFG Repo-Cleaner to remove from history

### Additional Security

- Use Supabase Row Level Security (RLS) - already configured
- Implement rate limiting on API routes
- Add CORS restrictions in production
- Use Vercel's built-in DDoS protection
- Monitor API usage in OpenAI and Supabase dashboards
