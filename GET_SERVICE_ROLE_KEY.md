# How to Get Your Supabase Service Role Key

## 🔑 Getting the Service Role Key

To complete the email confirmation bypass, you need to add your Supabase Service Role Key to the `.env.local` file.

### Steps to Get the Service Role Key:

1. **Go to Supabase Dashboard**:
   - Open https://supabase.com/dashboard
   - Select your project: `smprpytaezlktwfpdycq`

2. **Navigate to API Settings**:
   - Click on `Settings` in the left sidebar
   - Click on `API` in the settings menu

3. **Find the Service Role Key**:
   - Scroll down to the `Project API keys` section
   - Look for `service_role` key (it's different from anon key)
   - Click the "Copy" button or reveal/copy the key

4. **Add to Environment Variables**:
   - Open your `.env.local` file
   - Replace `your-service-role-key-here` with the actual service role key
   - Save the file

### Example:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZi...
```

## ⚠️ Security Warning

- The service role key has admin privileges
- Keep it secret and never commit it to version control
- Only use it on the server side (API routes)
- It bypasses Row Level Security (RLS)

## After Adding the Key:

1. Restart your development server: `npm run dev`
2. Try registering a new user
3. The signup should now work without email confirmation issues!

## What This Does:

The service role key allows the `/api/signup` endpoint to:
- Create users with admin privileges
- Automatically confirm their email addresses
- Bypass the email confirmation requirement
- Provide a smooth registration experience
