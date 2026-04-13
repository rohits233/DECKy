# Decky – AI Consulting Deck Builder

An AI-native B2B SaaS platform that creates consulting-grade slide decks from research documents and interview transcripts.

## Features

- **Document ingestion**: PDF, DOCX, TXT support for large research documents
- **7-stage AI pipeline**: Ingest → Chunk → Retrieve → Extract Insights → Plan → Generate Slides → Presenter Scripts
- **Insight extraction**: Findings, quotes, recommendations, risks, opportunities
- **Consulting-grade slides**: Professional layouts, icons, and styling
- **Presenter scripts**: Speaker notes, talking points, timing, and Q&A prep
- **Export**: PowerPoint (.pptx) with presenter notes

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: OpenAI GPT-4o-mini
- **Document parsing**: pdf-parse, mammoth

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENAI_API_KEY`.

3. Run Supabase migrations:
```bash
supabase db push
```

Or run `006_pipeline_schema.sql` manually in the Supabase SQL editor.

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pipeline Flow

1. **Upload** documents (PDF, DOCX, TXT)
2. Click **Generate Deck** to run the full pipeline
3. View **Extracted Insights** in the sidebar
4. Edit slides and view **Presenter Notes** when selecting a slide
5. **Export** to PowerPoint

## Deployment

Deploy to Vercel:
```bash
vercel
```

Make sure to add environment variables in Vercel dashboard.

## Project Structure

- `/src/app` - Next.js pages and API routes
- `/src/components` - React components
- `/src/lib` - Utilities and integrations
- `/src/types` - TypeScript definitions
- `/supabase/migrations` - Database schema
