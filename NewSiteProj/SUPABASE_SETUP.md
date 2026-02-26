# Supabase Authentication Setup

This project now uses Supabase for authentication. Follow these steps to set it up:

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose your organization
5. Enter a project name (e.g., "my-video-app")
6. Set a database password
7. Choose a region
8. Click "Create new project"

## 2. Get Your Supabase Credentials

1. Once your project is created, go to Project Settings
2. Click on "API" in the sidebar
3. Copy your **Project URL** and **anon public** key

## 3. Configure the Project

1. Open `script.js` file
2. Replace the placeholder values at the top:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual credentials:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## 4. Enable Email Authentication

1. In your Supabase project, go to Authentication → Settings
2. Under "Site URL", add your website URL (e.g., `http://localhost:3000` for development)
3. Under "Redirect URLs", add the same URL
4. Enable "Enable email confirmations" if you want email verification
5. Save your settings

## 5. Test the Authentication

You can now test the authentication flow:

1. **Sign Up**: Create a new account
2. **Sign In**: Log in with your credentials
3. **Forgot Password**: Test password reset
4. **Sign Out**: Log out of your account

## Features Implemented

- ✅ Email/Password authentication
- ✅ User registration (sign up)
- ✅ User login (sign in)
- ✅ Password reset
- ✅ User logout
- ✅ Session management
- ✅ Auth state listeners
- ✅ Automatic UI updates based on auth state

## Security Notes

- The Supabase anon key is safe to use in frontend code
- Never expose your service_role key in frontend code
- Always validate user data on the backend in production
- Consider enabling email confirmations for better security

## Troubleshooting

### "Invalid JWT" Error
- Check that your Supabase URL and anon key are correct
- Make sure your project is active

### "Email not confirmed" Error
- Check your email for a confirmation link
- Or disable email confirmations in Supabase settings for testing

### CORS Issues
- Add your domain to the CORS settings in Supabase
- For local development, add `http://localhost:3000` or your port

## Next Steps

You can now extend this with:
- User profiles in Supabase database
- File upload to Supabase Storage
- Real-time features with Supabase Realtime
- Row Level Security for data protection
