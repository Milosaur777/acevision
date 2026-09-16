# AceVision — Project Cost Estimate Report

**Date:** September 16, 2026
**Project:** AceVision — AI Tennis Intelligence Dashboard
**URL:** https://acevision-prod.vercel.app/

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | React framework, SSR, routing |
| **Language** | TypeScript | Type safety, better DX |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **UI Components** | shadcn/ui + Radix | Accessible components |
| **Icons** | Lucide React | Icon library |
| **Animations** | Framer Motion | Page transitions, micro-interactions |
| **Database** | Supabase (PostgreSQL) | Database, auth, storage |
| **AI** | n8n + Gemini Flash | Match analysis, predictions |
| **AI Fallback** | OpenRouter API | Direct AI calls when n8n unavailable |
| **Live Data** | Tennis-API.com (RapidAPI) | Match fixtures, rankings |
| **Hosting** | Vercel | Serverless deployment |
| **Version Control** | GitHub | Code repository |
| **Data Source** | Jeff Sackmann CSVs | Historical match data |

---

## Feature Breakdown & Cost Estimate

### 1. Dashboard Overview
**Complexity:** Medium
**Includes:**
- 4 stat cards with animated sparkline charts
- Top 20 players list with avatars, rankings, flags
- Recent matches list with navigation
- Prediction confidence/accuracy chart (custom SVG with tooltips)
- Quick action buttons

**Estimated Hours:** 4-5 hours
**Cost Range:** $80 - $200 (budget) / $200 - $400 (mid-level)

---

### 2. Player Management
**Complexity:** Medium-High
**Includes:**
- Player list page with search + country filter
- Player detail page with tabs (Matches, Notes, Profile)
- Head-to-head record display
- Career stats aggregation
- Player edit form (name, country, hand, ranking)
- Avatar management (Supabase Storage)
- Delete with cascade (matches + predictions)
- 750+ players from ATP database

**Estimated Hours:** 6-7 hours
**Cost Range:** $120 - $280 (budget) / $300 - $560 (mid-level)

---

### 3. Match Management
**Complexity:** Medium
**Includes:**
- Match list with scores, surfaces, tournaments
- Match detail with full stats
- 9,000+ matches imported (Sackmann CSVs)
- Delete with cascade (linked predictions)
- Match stats (aces, serve %, break points, etc.)

**Estimated Hours:** 4-5 hours
**Cost Range:** $80 - $200 (budget) / $200 - $400 (mid-level)

---

### 4. AI Predictions System
**Complexity:** High
**Includes:**
- Analysis page with player selection
- n8n workflow integration (webhook → AI → response)
- OpenRouter/Gemini Flash direct fallback
- Prediction storage (winner, confidence, reasoning, tactics)
- Prediction history with filters (All/Match/Hypothetical)
- Accuracy tracking (rolling 20-match window)
- Custom confidence chart with tooltips
- Delete predictions

**Estimated Hours:** 8-10 hours
**Cost Range:** $160 - $400 (budget) / $400 - $800 (mid-level)

---

### 5. Data Import & Sync
**Complexity:** High
**Includes:**
- CSV import (Sackmann format parser)
- Auto match scanner (Tennis-API.com integration)
- Stats refresh (enrich matches with serve/return data)
- ATP rankings sync (one-click update)
- Deduplication logic
- Auto-create missing players from API

**Estimated Hours:** 7-8 hours
**Cost Range:** $140 - $320 (budget) / $350 - $640 (mid-level)

---

### 6. UI/Design System
**Complexity:** High
**Includes:**
- Dark glassmorphism theme (custom CSS)
- Responsive design (mobile + desktop)
- Custom favicon/logo (AVIF format, multiple sizes)
- Sidebar navigation
- Mobile navigation bar
- Card system with glass borders
- Background image with fade overlay
- Typography system (Geist fonts)
- Color system (lime green accent)
- Loading states & animations
- Confirmation dialogs

**Estimated Hours:** 8-10 hours
**Cost Range:** $160 - $400 (budget) / $400 - $800 (mid-level)

---

### 7. Backend/API
**Complexity:** Medium-High
**Includes:**
- 8 API routes:
  - POST /api/analysis
  - GET /api/accuracy
  - POST /api/scan-matches
  - POST /api/refresh-stats
  - POST /api/update-rankings
  - GET/PATCH/DELETE /api/players/[id]
  - DELETE /api/predictions/[id]
  - DELETE /api/matches/[id]
- Supabase client setup (browser + server)
- Error handling
- Data validation

**Estimated Hours:** 6-7 hours
**Cost Range:** $120 - $280 (budget) / $300 - $560 (mid-level)

---

### 8. Deployment & DevOps
**Complexity:** Low-Medium
**Includes:**
- Vercel project setup
- Environment variables (Supabase, OpenRouter, RapidAPI)
- GitHub integration
- Domain configuration
- Build optimization

**Estimated Hours:** 2-3 hours
**Cost Range:** $40 - $120 (budget) / $100 - $240 (mid-level)

---

## Summary

### Total Estimated Hours: 45-55 hours

### Cost by Developer Level

| Level | Hourly Rate (USD) | Total Cost (USD) | Total Cost (SEK) |
|-------|-------------------|------------------|------------------|
| **Budget Fiverr** | $20-30/hr | **$900 - $1,650** | **9,500 - 17,500 kr** |
| **Mid-Level Freelancer** | $50-80/hr | **$2,250 - $4,400** | **24,000 - 46,500 kr** |
| **Senior Developer** | $100-150/hr | **$4,500 - $8,250** | **47,500 - 87,000 kr** |
| **Agency** | $150-250/hr | **$6,750 - $13,750** | **71,500 - 145,000 kr** |

*Exchange rate: 1 USD ≈ 10.5 SEK (September 2026)*

---

## Monthly Running Costs

| Service | Cost | Notes |
|---------|------|-------|
| **Vercel Hosting** | $0-20/mo | Free tier sufficient for now |
| **Supabase** | $0-25/mo | Free tier: 500MB DB, 1GB storage |
| **OpenRouter API** | $5-20/mo | Pay-per-use AI calls |
| **Tennis-API.com** | $0/mo | Free tier: 50 requests/day |
| **n8n (self-hosted)** | $0/mo | Running on your VPS |
| **Domain** | $10-15/year | If custom domain needed |
| **Total Monthly** | **$5-65/mo** | Depends on usage |

---

## What Makes This Project Valuable

1. **Custom AI Integration** — n8n workflow + Gemini Flash for match analysis
2. **Live Data Pipeline** — Tennis-API integration for real-time fixtures
3. **Historical Data** — 9,000+ matches with full stats
4. **Accuracy Tracking** — Rolling accuracy chart for AI predictions
5. **Production-Ready** — Deployed, working, responsive
6. **Scalable Architecture** — Supabase + Vercel serverless

---

## Pricing Recommendation (Client Budget: 15,000 SEK)

### Your Situation
- **Build time:** 2-3 days
- **Client budget:** 15,000 SEK (~$1,400 USD)
- **Your skill level:** Senior (this is quality work)

### Recommended Pricing Strategy

| Option | Price | Rationale |
|--------|-------|-----------|
| **Option A: Fair** | 8,000-9,000 kr | Matches value breakdown, leaves room for revisions |
| **Option B: Value** | 10,000-12,000 kr | Above value floor, justified by speed + quality |
| **Option C: Full Budget** | 15,000 kr | Maximum, but needs strong justification |

### What to Tell the Client

**"This is a production-ready AI-powered tennis analytics platform with:**
- 750+ player database with real ATP headshots
- 9,000+ historical matches with full stats
- AI prediction engine (Gemini Flash)
- Live match scanning from Tennis-API
- Accuracy tracking dashboard
- Mobile-responsive design
- Deployed and running at acevision-prod.vercel.app"

### Value Justification (Not Hours)

Don't sell hours — sell the **working system**:

| Component | Value |
|-----------|-------|
| Custom AI integration | 3,000-5,000 kr |
| Database + data pipeline | 1,500-3,000 kr |
| UI/UX design + implementation | 500-1,000 kr |
| Deployment + infrastructure | 500-1,000 kr |
| **Total Value** | **5,500-10,000 kr** |

### Maintenance Upsell (Monthly)

| Service | Price/mo | What's Included |
|---------|----------|-----------------|
| **Basic** | 500-1,000 kr | Bug fixes, data updates |
| **Standard** | 1,000-2,000 kr | + Feature additions, AI tuning |
| **Premium** | 3,000+ kr | + Priority support, custom features |

### Key Talking Points

1. **"This isn't a template — it's custom-built"**
2. **"The AI predictions will get smarter as more data comes in"**
3. **"Monthly costs are minimal (~50-100 kr/mo for hosting)"**
4. **"I can add features as your needs grow"**

### Risk Mitigation

- **Offer 2-3 rounds of revisions** included in price
- **Document the codebase** (FAVICON-VERCEL.md already exists)
- **Provide a handover document** with admin credentials
- **Suggest a maintenance agreement** for ongoing support

**Bottom line:** With your adjusted numbers, the value breakdown totals 5,500-10,000 kr. Price at **10,000-12,000 kr** for fair value, or push to **15,000 kr** if the client sees the strategic value of the AI system.
