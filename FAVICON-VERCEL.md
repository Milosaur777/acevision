# Favicon Setup Guide for Next.js + Vercel

## Overview

This guide explains how to properly set up a favicon for a Next.js 15+ application deployed on Vercel, including AVIF conversion with transparency.

## The Problem

Vercel aggressively caches favicons. Simply dropping a `favicon.ico` in `public/` or setting `metadata.icons` often fails because:

1. Browser caches favicons extremely aggressively
2. Next.js 15+ App Router handles favicons differently than Pages Router
3. Large PNG files (>100KB) may be ignored by browsers as favicons
4. Conflicting `<head>` tags + `metadata.icons` create duplicate/conflicting `<link>` tags

## The Solution (File-Based Icon)

Next.js 15+ App Router supports **file-based icons**. Place an `icon.png` (or `.ico`, `.svg`) directly in `src/app/` and Next.js automatically generates the correct `<link>` tags.

### Step-by-Step

### 1. Source Image

Start with a high-quality source image with transparency (PNG preferred):

```
Assets/acevision-av-favicon-website-green.png  (transparent PNG, ~900KB)
```

### 2. Convert to AVIF (85% Quality + Alpha)

Use `sharp` to convert to AVIF while preserving transparency:

```bash
npm install sharp
```

```javascript
const sharp = require('sharp');

// For the logo displayed in UI (sidebar, mobile header)
await sharp('Assets/source-logo.png')
  .avif({ quality: 85, effort: 4 })
  .toFile('public/logo.avif');
```

**Parameters:**
- `quality: 85` — high quality, good compression
- `effort: 4` — compression effort (0-9, higher = smaller file but slower)
- No `lossless: true` — we want compression, quality 85 is sufficient
- Transparency is preserved automatically from PNG source

### 3. Create Properly-Sized Favicon Files

Browsers need specific sizes. Generate them from the source:

```javascript
const sharp = require('sharp');
const fs = require('fs');

const input = 'Assets/source-logo.png';

// 32x32 PNG for browser tab favicon
await sharp(input)
  .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/favicon.png');

// 180x180 for Apple touch icon
await sharp(input)
  .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/apple-touch-icon.png');

// 192x192 for PWA manifest
await sharp(input)
  .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/icon-192.png');

// 64x64 for Next.js file-based icon (src/app/icon.png)
await sharp(input)
  .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('src/app/icon.png');
```

**File sizes after optimization:**
- `favicon.png`: ~2KB (32x32)
- `apple-touch-icon.png`: ~45KB (180x180)
- `icon-192.png`: ~51KB (192x192)
- `src/app/icon.png`: ~7KB (64x64)
- `public/logo.avif`: ~90KB (full size for UI display)

### 4. Metadata Configuration

In `src/app/layout.tsx`, set `metadata.icons` to reference the generated files:

```tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Your App Name",
  description: "Your app description",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050810",
};
```

**Critical: Do NOT add manual `<link>` tags in `<head>`**. Next.js generates them automatically from `metadata.icons` and `src/app/icon.png`. Manual tags create conflicts.

### 5. File Structure

```
public/
  favicon.png              # 32x32 browser favicon
  apple-touch-icon.png     # 180x180 iOS icon
  icon-192.png             # 192x192 PWA icon
  logo.avif                # Full-size AVIF for UI (sidebar, headers)
src/
  app/
    icon.png               # 64x64 Next.js auto-detected favicon
    layout.tsx             # metadata.icons configuration
```

### 6. Build Verification

Run the build and verify the icon route appears:

```bash
npx next build
```

Look for this in the output:
```
Route (app)
├ ○ /icon.png
```

If `/icon.png` appears, Next.js has detected your file-based icon.

### 7. Deploy to Vercel

```bash
git push origin master
```

Vercel auto-deploys. The favicon should now work.

### 8. Clear Browser Cache

If the favicon still doesn't appear:

1. **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear cache**: DevTools → Application → Clear storage → Clear site data
3. **Direct URL**: Visit `https://your-site.vercel.app/favicon.png` directly to confirm it loads
4. **Incognito mode**: Test in a private/incognito window

## Common Pitfalls

| Mistake | Why It Fails |
|---------|-------------|
| 900KB PNG as `src/app/icon.png` | Too large, browser ignores it |
| Manual `<link rel="icon">` in `<head>` | Conflicts with Next.js auto-generated tags |
| `metadata.icons` + `src/app/icon.png` | Can work, but remove manual `<head>` tags |
| Only `public/favicon.ico` | Works locally, Vercel may cache old version |
| No `sizes` attribute | Browser can't select optimal icon size |

## What Works (Summary)

1. ✅ `src/app/icon.png` (64x64, <10KB) — Next.js auto-detects
2. ✅ `metadata.icons` with multiple sizes — covers all devices
3. ✅ AVIF for UI logos (`public/logo.avif`) — NOT for favicon
4. ✅ PNG for favicon files — universal browser support
5. ✅ Proper sizing (32x32, 180x180, 192x192) — each has a purpose
6. ❌ NO manual `<head>` tags — let Next.js handle it
7. ❌ NO giant images as favicons — resize to <10KB

## AVIF Quality Guidelines

For UI display logos (NOT favicons):

| Source Size | Target Size | Quality | Format |
|-------------|-------------|---------|--------|
| >500KB | ≤60KB | 50-60% | AVIF |
| ≤500KB | ≤80% of source | 70-85% | AVIF |
| Any | Preserve alpha | 85% | AVIF |

Example command:
```bash
npx sharp input.png --avif --quality 85 -o output.avif
```

For favicons specifically: use PNG at 32x32, not AVIF. Browser favicon support for AVIF is inconsistent.
