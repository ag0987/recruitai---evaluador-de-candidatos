# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run backend (Express, port 4000) — required for API calls
npm run server

# Run frontend dev server (Vite, port 3000)
npm run dev

# Type check (no emit)
npm run lint
```

Both servers must run concurrently during development. Vite proxies `/api/*` → `http://127.0.0.1:4000`.

**Environment variable required:** Create `.env.local` at the project root with:
```
GEMINI_API_KEY=your_key_here
```

## Architecture

This is a split frontend/backend app where the backend's sole job is to keep the Gemini API key private.

```
server.ts          — Express backend (port 4000), two routes:
                     POST /api/evaluate   → candidate scoring via Gemini
                     POST /api/interview  → interview question generation via Gemini

vite.config.ts     — Vite root is `frontend/`, proxies /api to :4000

frontend/src/
  App.tsx          — Single-page UI, all state lives here
  lib/gemini.ts    — Thin fetch wrappers for /api/evaluate and /api/interview
  lib/fileParser.ts — PDF text extraction (pdfjs-dist) + DOCX (mammoth)
```

### Data flow

1. User pastes a job description (JD) and uploads CVs (`.txt`, `.pdf`, `.docx`)
2. `fileParser.ts` extracts plain text client-side; scanned PDFs (< 100 chars extracted) are rejected
3. `gemini.ts` POSTs `{ jd, cv }` to `/api/evaluate` → backend calls `gemini-flash-latest` with a layered scoring prompt
4. Backend returns `CandidateEvaluation` (score 1–10, recommendation, strengths, gaps, dataIntegrity)
5. For candidates recommended "Avanzar", user can request interview prep via `/api/interview`

### Shared types

`CandidateEvaluation` and `InterviewQuestion` interfaces are **duplicated** in `server.ts` and `frontend/src/lib/gemini.ts` — keep them in sync manually when changing the schema.

### Scoring logic (in the backend prompt)

Evaluation is layered: experience relevance is a hard filter (auto-discard if missing), then skills, education, and achievements add points. Gemini is forced to return structured JSON via `responseMimeType: 'application/json'` + `responseSchema`.

### Interview categories

The backend maps Gemini's raw category strings (`Fortalezas`, `Brechas`, `Motivacion`, `Situacional`) through `categoryMap` to normalize `Motivacion` → `Motivación`. The frontend filters questions by these exact category names to render color-coded sections.
