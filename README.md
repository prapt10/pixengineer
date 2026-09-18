# Pix Engineer — AI-Powered App Builder & Design-to-Code Platform

> **Built with AI assistance. Shipped as a real, production-grade SaaS.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)

---

## What is this?

**Pix Engineer** is an all-in-one AI productivity platform that lets users:

- **Build full-stack apps** from natural-language prompts
- **Convert designs/images to code** (Design to Code)
- **Craft and optimize prompts** with a dedicated Prompt Studio
- **Chat with an advanced AI assistant** (Pix Chat) supporting vision, web search, and threaded history
- **Pay per use** with a credit-based billing system and free/premium tiers

It is a complete, responsive SaaS product with auth, payments, RBAC, storage, SEO, a PWA install flow, and multi-model AI orchestration.

---

## Key features

| Feature | Description |
|---------|-------------|
| **AI App Builder** | Generate complete projects (React, Next.js, HTML) from prompts with live preview and downloadable files. |
| **Design to Code** | Upload screenshots/mockups and get production-ready code. |
| **Prompt Engineer** | Generate, refine, and convert prompts for coding, copywriting, and more. |
| **Pix Chat** | ChatGPT-style assistant with streaming responses, web search, vision (image upload), and persistent thread history. |
| **Credit System** | Free daily credits + paid top-ups, Razorpay integration, and usage-based model routing. |
| **Auth & Profiles** | Supabase auth (email + Google OAuth), user profiles, avatar upload, account deletion. |
| **Admin Dashboard** | Manage users, output formats, platform config, and monitor API balance. |
| **SEO & PWA** | Dynamic sitemap, JSON-LD, Open Graph, robots.txt, and installable PWA icons/manifest. |

---

## Tech stack

### Frontend
- **React 18** — UI library
- **TypeScript 5** — type-safe development
- **Vite 5** — fast build tooling and HMR
- **Tailwind CSS 3** — utility-first styling
- **shadcn/ui + Radix UI** — accessible, themeable components
- **Framer Motion** — animations and transitions
- **React Router v6** — client-side routing
- **React Query (TanStack Query)** — server-state caching
- **React Hook Form + Zod** — forms and validation
- **react-markdown + highlight.js** — markdown rendering and code highlighting

### Backend & Cloud
- **Supabase (Cloud)** — Postgres database, auth, Edge Functions, storage
- **Row-Level Security (RLS)** — per-user data isolation
- **Supabase Edge Functions (Deno)** — AI orchestration and payment webhooks
- **Storage buckets** — uploads, avatars, and chat attachments

### AI & Payments
- **OpenRouter** — multi-model AI gateway (GPT, Claude, Llama, Qwen, Gemini)
- **Razorpay** — Indian payment gateway for credit purchases

### DevOps & Quality
- **ESLint 9 + TypeScript ESLint** — linting
- **Vitest + Testing Library** — unit testing

---

## Architecture overview

```text
┌─────────────────────────────────────┐
│  React 18 + Vite + Tailwind SPA     │
│  (PWA, responsive, dark/light theme)  │
└──────────────┬──────────────────────┘
               │ REST / SSE / Storage
               ▼
┌─────────────────────────────────────┐
│  Supabase Auth + Postgres + RLS       │
│  Storage Buckets + Edge Functions     │
└──────────────┬──────────────────────┘
               │ OpenRouter / Razorpay
               ▼
┌─────────────────────────────────────┐
│  AI Models (GPT-5, Claude, Llama...) │
│  Payment webhooks                    │
└─────────────────────────────────────┘
```

---

## Project structure

```text
src/
├── components/          # Reusable UI components (Header, Footer, chat, admin)
├── pages/               # Route-level pages (AppBuilder, Chat, Pricing, etc.)
├── hooks/               # Custom React hooks (auth, profile, currency, theme)
├── lib/                 # API helpers and utilities
├── integrations/        # Supabase client and generated types
public/                  # Static assets, sitemap, manifest, icons
supabase/
├── functions/           # Edge Functions (chat, build-app, prompt-engineer, payments, sitemap)
└── migrations/          # Database schema and seed migrations
```

---

### Prerequisites
- Node.js 18+
- A Supabase project
- OpenRouter API key
- Razorpay keys (for payments)

### Install
```bash
git clone <your-github-url>
cd <project-name>
npm install
```

### Environment variables
Create a `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Backend secrets (Supabase Edge Functions):
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Run locally
```bash
npm run dev
```

### Run tests
```bash
npm test
```

---

## AI-assisted development

This project was developed with **AI pair programming** assistance (large language models) for:

- Component scaffolding and responsive layouts
- Database schema design and RLS policies
- Supabase Edge Functions for AI orchestration
- SEO metadata, sitemaps, and structured data
- Payment and credit-billing flows

All business logic, security rules, and UX decisions were reviewed, refined, and validated by a human developer.

---

## Demo

### AI App Builder
Describe an app in plain English, browse the example gallery, and preview generated projects live.

![App Builder demo](public/demo/app-builder-demo.gif)

### Pix Chat
ChatGPT-style assistant with streaming markdown responses, web search, vision, and thread history — usable without signing in.

![Pix Chat demo](public/demo/pix-chat-demo.gif)

---

## License

This is a private portfolio project. Source code is shown for demonstration purposes.

---
