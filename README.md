# Spice Haven Sellable Restaurant Template

A ready-made hotel/restaurant website template with public pages, a protected `/admin` dashboard, working table bookings, Cloudinary image uploads, editable site settings, and Vercel-friendly API routes.

## Features

- Public home, menu, about/contact, image gallery, and book-a-table pages
- Manual admin access at `/admin` only; it is not shown in public navigation
- Admin login from environment variables
- Bookings saved through the API and shown in the dashboard
- Cloudinary uploads for full menu images and individual item images
- Public gallery page that displays uploaded menu and item images
- Editable restaurant name, social links, opening hours, and Google Maps embed
- Editable homepage and page header image URLs with local template images as fallbacks

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Run locally:

```bash
npm run dev
```

4. Open the website:

- Public site: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin`

No Vercel login is required to run locally.

## Environment Variables

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
SESSION_SECRET=replace-with-a-long-random-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Vercel Deployment

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables in Vercel Project Settings.
4. Deploy.
5. Give the hotel owner the `/admin` URL and login credentials.

GitHub Pages can still host the static files, but bookings, admin login, settings, and uploads need the Vercel/Node API.

## Checks

```bash
npm run check
npm run smoke
```

The smoke test confirms the admin page loads, protected admin data is blocked before login, public settings work, the gallery page loads, bookings can be created, and admin data loads after login.
