# Google Gemini API Setup Guide

## Issue: Chatbot Not Working

If your AI Chatbot is not working, it's likely because the `GEMINI_API_KEY` is not configured in your `.env` file.

## Quick Fix (5 minutes)

### Step 1: Get Your Gemini API Key

1. Go to **Google AI Studio**: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy the API key (it will look like: `AIzaSy...`)

**Note:** Google Gemini has a **FREE tier** with generous limits:
- 60 requests per minute
- 1,500 requests per day
- No credit card required!

### Step 2: Create .env File

In the `backend` directory (`/home/user/school-dashboard/backend/`), create a `.env` file:

```bash
# Copy from example
cp .env.example .env
```

### Step 3: Add Your API Key

Open the `.env` file and add your Gemini API key:

```bash
# AI Configuration
GEMINI_API_KEY=AIzaSy...your_actual_api_key_here
GEMINI_MODEL=gemini-pro
GEMINI_TIMEOUT=120000
```

### Step 4: Configure Other Required Variables

Make sure these are also set in your `.env` file:

```bash
# Database (adjust to your setup)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_dashboard
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret (generate a secure one)
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_required

# CORS (allow your frontend)
CORS_ORIGIN=http://localhost:3000

# Environment
NODE_ENV=development
PORT=5000
```

### Step 5: Restart Backend Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
# or
npm run dev
```

## Verification

1. Open your application
2. Go to the **AI Chatbot** page
3. Try sending a message like: "Xin chào!"
4. You should get a response from the AI

## Troubleshooting

### Problem: Still getting errors after adding API key

**Check the logs for these errors:**

1. **"timeout of 30000ms exceeded"**
   - **Solution:** Already fixed! Timeout increased to 120 seconds
   - Make sure `GEMINI_TIMEOUT=120000` is in your `.env`

2. **"The model is overloaded" (503 error)**
   - **Solution:** Already fixed! Auto-retry with exponential backoff
   - The system will retry up to 3 times (2s, 4s, 6s delays)
   - This usually happens during peak hours

3. **"Too many AI requests"**
   - **Solution:** Rate limit is 10 requests per minute per user
   - Wait 1 minute and try again
   - This is a security feature to prevent abuse

4. **"API key not configured"**
   - **Solution:** Check that `.env` file exists and contains `GEMINI_API_KEY`
   - Make sure there are no typos in the key
   - Restart the backend server after adding the key

### Problem: Predictions page showing all students "At Risk"

**Already Fixed!** The issues were:
- Case-sensitive attendance check (fixed: now case-insensitive)
- Wrong default attendance rate (fixed: defaults to 100% if no records)
- Sequential API calls (fixed: now parallel for faster loading)
- Validation limits too low (fixed: increased from 100 to 50,000)

### Problem: 400 Bad Request on grades/attendance

**Already Fixed!** The validation was rejecting `limit=10000`:
- `grade.routes.js`: Increased max limit to 50,000
- `attendance.routes.js`: Increased max limit to 50,000

## API Rate Limits

### Google Gemini FREE Tier
- **60 requests/minute**
- **1,500 requests/day**
- **No cost!**

### Application Rate Limits (Security)
- **AI Chatbot:** 10 requests/minute per user
- **General API:** 100 requests per 15 minutes per IP

## Need Help?

1. Check backend logs for error messages
2. Verify `.env` file exists and has correct values
3. Make sure backend server restarted after adding `.env`
4. Ensure you're using a valid Gemini API key
5. Check that your Google account has API access enabled

## Alternative: Test Without Gemini

If you want to test the application without setting up Gemini:

1. The system will show fallback messages when API is unavailable
2. All other features (grades, attendance, dashboard, etc.) work independently
3. Only the AI Chatbot requires the Gemini API key

## Security Notes

- **Never commit `.env` files to Git** (already in `.gitignore`)
- Keep your API key private
- Rotate your API key if exposed
- Use different keys for development and production

---

**Last Updated:** 2025-11-12
**Related Fixes:** Validation limits, Timeout increase, Retry logic, Case-insensitive checks
