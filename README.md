# AceVision

AI-powered tennis match analysis, predictions, and player insights.

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **AI Backend:** n8n + Gemini Flash
- **Data:** Jeff Sackmann's ATP/WTA databases
- **Deploy:** Vercel

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
N8N_WEBHOOK_BASE_URL=https://n8n.trinetraos.com/webhook
N8N_API_KEY=your_n8n_api_key
```

## Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor.

## Deploy

Push to GitHub and connect to Vercel for automatic deployments.
