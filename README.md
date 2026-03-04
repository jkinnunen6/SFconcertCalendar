# Bay Area Shows

A concert calendar pulling live data from Supabase.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env.local`** (copy from `.env.local.example`)
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://yopjvjrgpjjcgapihkfy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```
   Get your anon key from: Supabase dashboard → Project Settings → API → `anon public`

3. **Run locally**
   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Supabase RLS

Make sure your `events` and `venues` tables have a Row Level Security policy
that allows public read access. In Supabase SQL editor:

```sql
-- Allow public read on events
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);

-- Allow public read on venues  
CREATE POLICY "Public read venues" ON venues FOR SELECT USING (true);
```
