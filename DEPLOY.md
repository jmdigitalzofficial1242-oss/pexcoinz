# Pexcoin Vercel Deployment Guide

Everything is ready for Vercel! Follow these steps to go live:

## 1. Push to GitHub
Ensure your `pexcoin-live` folder is in a GitHub repository.

## 2. Connect to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** > **Project**.
3. Import your repository.
4. **IMPORTANT**: Set the **Root Directory** to `pexcoin-live`.
5. Vercel should automatically detect the settings from `vercel.json`.

## 3. Configure Environment Variables
Copy the values from your `.env` file to the Vercel **Environment Variables** section:
- `MONGODB_URI` (Use your Atlas production URI)
- `JWT_SECRET` (Generate a strong one)
- `PASSWORD_SALT`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SUPER_ADMIN_EMAIL`
- `FRONTEND_URL` (Set this to your Vercel URL after the first deployment)

## 4. Build & Deploy
Click **Deploy**. Vercel will:
1. Build the Frontend (`client`).
2. Set up the Backend API (`server`).
3. Serve everything on one domain.

## 5. Post-Deployment
- Once you have the Vercel URL (e.g., `pexcoin-live.vercel.app`), go back to Environment Variables and update `FRONTEND_URL` to that URL.
- Redeploy to apply the change.

---
**Note:** If you want to use a custom domain, you can add it in Vercel settings.
