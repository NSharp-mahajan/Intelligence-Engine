# Career Intelligence Engine 🚀

Career Intelligence is a deterministic matching, eligibility evaluation, and career intelligence platform for modern engineering candidates. It replaces traditional "black box" resume-parsing and noisy job boards with an evidence-based system that scores candidate capabilities directly against real-world engineering roles across top tech employers.

Stop searching. Start matching.

---

## 🏗️ System Architecture

The Intelligence Engine is structured as a full-stack TypeScript monorepo with an isolated Next.js frontend, an Express API backend, and an asynchronous multi-source ingestion daemon.

```mermaid
flowchart TD
    subgraph Frontend [Next.js Web Application]
        UI[App Router & Discovery Workspace]
        Dash[Career Intelligence Dashboard]
        MatchUI[3-Column Semantic Match Analysis]
        EvidUI[Skills & Projects Evidence Workspace]
        BrandUI[Resilient Company Logo Component]
        AuthC[Clerk Auth Client]
    end

    subgraph Backend [Express API]
        API[Express Router]
        AuthS[Clerk Auth Middleware]
        Zod[Zod Validation]
        MatchSvc[Matching & Evidence Graph Service]
        EligSvc[Deterministic Eligibility Evaluator]
        DashSvc[Dashboard Metrics & Recommendation Engine]
        BrandSvc[Company Logo Resolution Service]
        Prisma[Prisma ORM & PostgreSQL Adapters]
    end

    subgraph Ingestion [Multi-Source ETL & Ingestion Worker]
        Worker[Ingestion Worker & Scheduler]
        GH[Greenhouse Provider]
        LV[Lever Provider]
        JB[Jobicy Provider]
        Ashby[Ashby Provider]
        SR[SmartRecruiters Provider]
    end

    subgraph External [External APIs & CDNs]
        ExtGH[(Greenhouse ATS)]
        ExtLV[(Lever ATS)]
        ExtJB[(Jobicy API)]
        ExtAshby[(Ashby ATS)]
        GoogleCDN[(Google Favicon V2 CDN)]
    end

    subgraph Data [Data Persistence]
        PG[(PostgreSQL Database)]
    end

    User((Candidate)) -->|HTTPS| UI
    UI <-->|JWT / Session| AuthC
    UI -->|REST API| API
    Dash --> API
    MatchUI --> API
    EvidUI --> API
    API <-->|Verify JWT| AuthS
    API -->|Validate| Zod
    API -->|Evaluate| MatchSvc & EligSvc & DashSvc
    API -->|Resolve Logos| BrandSvc
    BrandSvc -.-> GoogleCDN
    UI -.-> BrandUI
    BrandUI -.-> GoogleCDN
    API -->|Indexed & Windowed Queries| Prisma
    Prisma <--> PG

    Worker -->|Fetch & Paginate| GH & LV & JB & Ashby & SR
    Worker -->|Idempotent Upsert & Deduplicate| Prisma
```

### 💻 Technology Stack

**Frontend (`apps/web`)**
*   **Framework:** [Next.js (App Router)](https://nextjs.org/) (Turbopack, React 19)
*   **Language:** TypeScript
*   **Authentication:** Clerk (`@clerk/nextjs`)
*   **Branding & Assets:** High-resolution Google Favicon V2 CDN integration with zero-layout-shift fallback tiles
*   **Styling:** Scoped CSS-in-JS design tokens with warm off-white surfaces (`#faf9f6`), dark charcoal typography (`#1c1917`), orange primary accent (`#ea580c`), and verified emerald badges (`#15803d`). Zero Tailwind CSS dependency.
*   **Data Fetching:** Native `fetch` with authenticated JWT Bearer headers and reactive state synchronization

**Backend (`apps/api`)**
*   **Framework:** [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
*   **Language:** TypeScript (Executed via `tsx`)
*   **Database:** PostgreSQL 15+
*   **ORM:** [Prisma 7](https://www.prisma.io/) + `@prisma/adapter-pg`
*   **Authentication:** Clerk (`@clerk/express`)
*   **Validation:** Zod for strict runtime schema parsing
*   **Ingestion & Scheduling:** Asynchronous CLI worker with bounded retries, concurrency locks, and round-robin multi-source providers

---

## 🧠 Core Features & Subsystems

### 1. Career Intelligence Dashboard (`/portal`)
The central candidate workspace synthesizing real-time career readiness metrics and personalized discovery:
*   **Disambiguated Intelligence KPIs:** Clearly distinguishes between Total Platform Inventory (2,348+ roles), Skill-Matched Roles, and Verified Eligible Opportunities.
*   **Transparent Profile Progress:** Evaluates 5 core dimensions: Personal Information, Education (University & Grad Year), Career Direction, Skills Inventory, and Project Evidence. Missing projects correctly caps profile completion at 80%.
*   **Curated Opportunity Recommendations:** Recommends high-signal roles sorted by match score, strictly filtering out Senior, Staff, and Principal positions for early-career students.
*   **Market Skill Gap Insights:** Automatically identifies frequently required skills in active market roles that are absent from the candidate's profile.

### 2. Opportunity Match Analysis (`/opportunities/[id]/match`)
A dedicated, candidate-facing 3-column analysis page inspired by semantic job matching:
*   **Left Column (Context):** Role summary (company, title, type, location, work mode), structured requirements, and candidate snapshot.
*   **Center Column (Semantic Alignment):** Overall match score meter, required vs. preferred skills breakdown, and requirement-by-requirement comparison tagged as `✓ Demonstrated in <Project>`, `✓ Documented in skills inventory`, or `✕ Missing`.
*   **Right Column (Verified Eligibility):** Evaluates candidate criteria (graduation batch, months of professional experience, degree, branch, CGPA, and backlogs) independently from skill match. Confirms the core invariance: **a high skill match score never overrides a verified eligibility failure**.

### 3. Skills & Projects Evidence Workspace (`/evidence`)
A developer portfolio workspace that grounds technical claims in tangible repository codebases:
*   **Deterministic Categorization:** Organizes skills into 7 core engineering domains: *Programming Languages*, *Frontend Development*, *Backend Development*, *AI & Machine Learning*, *Databases*, *Developer Tools*, and *Other*.
*   **Evidence Mapping Matrix:** Side-by-side view distinguishing skills supported by active projects from skills awaiting evidence, with a 1-click modal to link unbacked skills to project repositories.
*   **Project Portfolio Grid:** Displays project codebases with GitHub repository links, live deployment URLs, and interactive skill tags.

### 4. Balanced Discovery & Early Career Feeds
*   **Early Opportunities Feed (`/opportunities/early-career`):** Curated early-career roles across Software Engineering, Product & Design, Data & Analytics, Operations & Business.
*   **India Opportunities Feed (`/opportunities/india`):** Domestic opportunities feed with automated overseas exclusion and employer interleaving.
*   **Balanced Discovery Feed (`/opportunities`):** Uses a PostgreSQL window function (`ROW_NUMBER() OVER (PARTITION BY source ORDER BY "postedDate" DESC)`) to interleave listings fairly across Greenhouse, Jobicy, Lever, and Ashby, eliminating provider clumping.

### 5. Multi-Source Ingestion Worker
The ETL worker continuously ingests live roles from top tech employer ATS boards:
*   **Providers Supported:** Greenhouse, Lever, Jobicy, Ashby, SmartRecruiters.
*   **Idempotent Upserts:** Matches on `(source, sourceJobId)` with SHA-256 content hashing to eliminate duplicates.
*   **Deterministic Normalization:** Normalizes experience levels, employment types, work modes, and job families.

```bash
# Run a one-off ingestion cycle across all active providers
npx --prefix apps/api tsx src/worker.ts --once --providers=greenhouse,lever,jobicy,ashby --limit=25
```

---

## 📂 Monorepo Structure

```text
intelligence-engine/
├── apps/
│   ├── api/                          # Express 5 Backend Core
│   │   ├── prisma/                   # Prisma schema & migrations
│   │   ├── src/
│   │   │   ├── routes/               # Express controllers (auth, dashboard, profile, opportunities, skills)
│   │   │   ├── services/             # Core business engines
│   │   │   │   ├── dashboardService.ts            # KPI synthesis & curated recommendations
│   │   │   │   ├── matchingService.ts             # Deterministic skill matching & evidence map
│   │   │   │   ├── candidateEligibilityEvaluator.ts # Pure eligibility rules evaluator
│   │   │   │   ├── companyLogoService.ts          # Domain lookup & Google Favicon V2 resolver
│   │   │   │   └── earlyCareerClassifier.ts       # Category & experience extractor
│   │   │   ├── lib/                  # Providers, normalizers, and Prisma client
│   │   │   └── worker.ts             # Ingestion ETL worker CLI entry point
│   │   └── package.json
│   │
│   └── web/                          # Next.js 16 (App Router) Frontend
│       ├── app/
│       │   ├── (auth)/               # Authenticated candidate routes
│       │   │   ├── portal/           # Main Career Intelligence Dashboard
│       │   │   ├── evidence/         # Skills & Projects Evidence Workspace
│       │   │   ├── opportunities/    # Discovery feed, early-career feed, and match analysis
│       │   │   │   ├── [id]/         # Opportunity Detail View
│       │   │   │   │   └── match/    # 3-Column Opportunity Match Analysis Page
│       │   │   │   └── early-career/ # Dedicated Early Opportunities Feed
│       │   │   └── onboarding/       # Multi-step candidate onboarding
│       │   ├── globals.css           # Design tokens, CSS variables, base styles
│       │   └── layout.tsx            # Root layout & Clerk provider
│       ├── components/               # Reusable UI primitives (Button, Modal, Input, Badge, CompanyLogo)
│       ├── lib/                      # Client-side API fetchers, types, and skill categories
│       └── package.json
```

---

## 🚀 Local Development Setup

### Prerequisites
*   **Node.js:** v20+ (tested on Node.js v20 and v26)
*   **npm:** v10+
*   **Docker Desktop:** For local PostgreSQL container
*   **Clerk Account:** For authentication API keys

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/NSharp-mahajan/Intelligence-Engine.git
cd Intelligence-Engine

# Install backend dependencies
cd apps/api && npm install

# Install frontend dependencies
cd ../web && npm install
cd ../..
```

### 2. Configure Environment Variables
Create `.env` in `apps/api` and `apps/web` based on their respective `.env.example` templates:

```ini
# apps/api/.env
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/intelligence_engine?schema=public"
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
FRONTEND_URL="http://localhost:3000"
```

```ini
# apps/web/.env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/register"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### 3. Database Migration
```bash
cd apps/api
npx prisma generate
npx prisma db push
```

### 4. Run Development Servers
```bash
# Terminal 1: Express API (Port 3001)
npm --prefix apps/api run dev

# Terminal 2: Next.js Frontend (Port 3000)
npm --prefix apps/web run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

---

## 🧪 Automated Test Suites & Verification

The codebase includes exhaustive automated regression test suites covering all business invariants:

```bash
# 1. Dashboard Intelligence, Suitability & Recommendation Tests (8 tests)
npx --prefix apps/api tsx apps/api/src/testDashboard.ts

# 2. Targeted Eligibility Defect Remediation Suite (20 tests)
npx --prefix apps/api tsx apps/api/src/testMilestone3E_TargetedDefects.ts

# 3. Candidate Eligibility & Express API Integration Suite (84 tests)
npx --prefix apps/api tsx apps/api/src/testCandidateEligibility.ts

# 4. Early Opportunities Feed, Search, Geo & Filter Suite (100 tests)
npx --prefix apps/api tsx apps/api/src/testEarlyOpportunitiesFeed.ts

# 5. Production Build Typecheck & Page Generation
npm --prefix apps/api run build
npm --prefix apps/web run build
```

---

## 🚢 Production Deployment Guide

### Deployment Topology
*   **Web Frontend (`apps/web`)**: Deploy to [Vercel](https://vercel.com/) or [Railway](https://railway.app/). Set root directory to `apps/web`.
*   **API Server (`apps/api`)**: Deploy to [Railway](https://railway.app/), [Render](https://render.com/), or [Fly.io](https://fly.io/). Set root directory to `apps/api`.
*   **PostgreSQL**: Managed PostgreSQL 15+ (e.g. Neon, Supabase, AWS RDS, Railway).

### Production Environment Variables

#### Backend (`apps/api`)
```ini
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
FRONTEND_URL=https://<your-frontend-domain>.com
```

#### Frontend (`apps/web`)
```ini
NODE_ENV=production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_API_URL=https://<your-api-domain>.com/api
```

### Production Migration Command
```bash
npx --prefix apps/api prisma migrate deploy
```

---

## 📄 License
This project is proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.  
*Built for the modern candidate.*
