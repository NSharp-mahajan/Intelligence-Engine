# Career Intelligence Engine 🚀

Career Intelligence is a deterministic matching and discovery engine for modern engineering careers. It replaces traditional "black box" resume-parsing and noisy job boards with an evidence-based system that scores candidate capabilities directly against real-world engineering roles across top tech employers.

Stop searching. Start matching.

---

## 🏗️ System Architecture

The Intelligence Engine is structured as a full-stack TypeScript monorepo with an isolated Next.js frontend, an Express API backend, and an asynchronous multi-source ingestion daemon.

```mermaid
flowchart TD
    subgraph Frontend [Next.js Web Application]
        UI[App Router & Discovery Workspace]
        BrandUI[Resilient Company Logo Component]
        AuthC[Clerk Auth Client]
    end

    subgraph Backend [Express API]
        API[Express Router]
        AuthS[Clerk Auth Middleware]
        Zod[Zod Validation]
        BrandSvc[Company Logo Resolution Service]
        Prisma[Prisma ORM & PostgreSQL Adapters]
    end

    subgraph Ingestion [Multi-Source ETL & Ingestion Worker]
        Worker[Ingestion Worker & Scheduler]
        GH[Greenhouse Provider]
        LV[Lever Provider]
        JB[Jobicy Provider]
    end

    subgraph External [External APIs & CDNs]
        ExtGH[(Greenhouse Job Boards)]
        ExtLV[(Lever Job Boards)]
        ExtJB[(Jobicy API)]
        GoogleCDN[(Google Favicon V2 CDN)]
    end

    subgraph Data [Data Persistence]
        PG[(PostgreSQL Database)]
    end

    User((User)) -->|HTTPS| UI
    UI <-->|JWT / Session| AuthC
    UI -->|REST API| API
    API <-->|Verify JWT| AuthS
    API -->|Validate| Zod
    API -->|Resolve Logos| BrandSvc
    BrandSvc -.-> GoogleCDN
    UI -.-> BrandUI
    BrandUI -.-> GoogleCDN
    API -->|Window Function & Fair Feed Queries| Prisma
    Prisma <--> PG

    Worker -->|Fetch & Paginate| GH & LV & JB
    GH --> ExtGH
    LV --> ExtLV
    JB --> ExtJB
    Worker -->|Idempotent Upsert & Deduplicate| Prisma
```

### 💻 Technology Stack

**Frontend (`apps/web`)**
*   **Framework:** [Next.js (App Router)](https://nextjs.org/) (Turbopack, React 19)
*   **Language:** TypeScript
*   **Authentication:** Clerk (`@clerk/nextjs`)
*   **Branding & Assets:** High-resolution Google Favicon V2 CDN integration with zero-layout-shift fallback tiles
*   **Styling:** Tokenized CSS-in-JS design system with strict dark/light surfaces and accessible contrast
*   **Data Fetching:** Native `fetch` with authenticated JWT Bearer headers and reactive state synchronization

**Backend (`apps/api`)**
*   **Framework:** [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
*   **Language:** TypeScript (Executed via `tsx`)
*   **Database:** PostgreSQL
*   **ORM:** [Prisma 7](https://www.prisma.io/) + `@prisma/adapter-pg`
*   **Authentication:** Clerk (`@clerk/express`)
*   **Validation:** Zod for strict runtime schema parsing
*   **Ingestion & Scheduling:** Asynchronous CLI worker with bounded retries, concurrency locks, and round-robin multi-source providers

---

## 📂 Monorepo Structure

```text
intelligence-engine/
├── apps/
│   ├── api/                          # Express Backend Core
│   │   ├── prisma/                   # Schema definitions & migrations
│   │   ├── src/
│   │   │   ├── routes/               # API route controllers (opportunities, matches)
│   │   │   ├── services/             # Core business & utility services
│   │   │   │   ├── companyLogoService.ts   # Domain lookup & Google Favicon V2 resolver
│   │   │   │   └── ingestionScheduler.ts  # ETL orchestration, retries, and locks
│   │   │   ├── lib/                  # Providers & data access
│   │   │   │   ├── greenhouseProvider.ts   # Greenhouse board scraper & normalizer
│   │   │   │   ├── leverProvider.ts        # Lever board scraper & normalizer
│   │   │   │   ├── jobicyProvider.ts       # Jobicy API client & normalizer
│   │   │   │   └── prisma.ts               # Shared Prisma client
│   │   │   └── worker.ts             # Ingestion CLI worker entry point
│   │   └── package.json
│   │
│   └── web/                          # Next.js Frontend Core
│       ├── app/
│       │   ├── (auth)/               # Authenticated routes & Discovery Workspace
│       │   │   ├── opportunities/    # Discovery feed & detailed opportunity view
│       │   │   └── ...
│       │   ├── globals.css           # CSS token variables & base animations
│       │   └── layout.tsx            # Root layout & providers
│       ├── components/               # Reusable UI primitives
│       │   ├── CompanyLogo.tsx       # Resilient brand logo with lettermark fallback
│       │   └── ...
│       ├── lib/                      # Shared types & utilities
│       │   ├── companyLogo.ts        # Client-side logo resolver
│       │   └── types.ts              # Core TypeScript interfaces
│       └── package.json
```

---

## 🧠 Core Subsystems

### 1. Multi-Source Ingestion & Scheduling Worker
The ingestion pipeline sources live engineering roles across three distinct provider classes:
*   **Jobicy:** Public developer and remote job feeds with rich salary and category metadata.
*   **Greenhouse:** Direct ATS boards across tech employers (e.g. Cloudflare, Databricks, Stripe, Figma, Airbnb).
*   **Lever:** ATS boards across engineering organizations (e.g. Palantir, Spotify, Netflix, Twitch).

**Key Worker Capabilities:**
*   **Single-Cycle or Daemon Execution:** Run one-off syncs with `--once` or continuous scheduling via cron intervals.
*   **Concurrency Locking:** Prevents overlapping runs within the same process.
*   **Bounded Retries & Exponential Backoff:** Gracefully handles transient network timeouts (default: 30s timeout, 2 retries).
*   **Non-Fatal Partial Failures:** If one ATS provider fails or rate-limits, successful providers commit their data uninterrupted.
*   **Idempotent Upsert & Data Preservation:** Matches on `(source, sourceJobId)`, refreshes `lastSeenAt`, and updates mutable fields while preserving existing skills and properties.

```bash
# Run a one-off ingestion cycle across all providers
cd apps/api
npx tsx src/worker.ts --once --providers=jobicy,greenhouse,lever --limit=25
```

### 2. Balanced Discovery Feed
Traditional feeds suffer from "provider clumping" where hundreds of consecutive listings from a single source dominate the first pages.

The Intelligence Engine solves this using a **PostgreSQL window function** for default discovery:
```sql
SELECT id FROM (
  SELECT id, source,
         ROW_NUMBER() OVER (
           PARTITION BY source
           ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
         ) as source_rank
  FROM "Opportunity"
  WHERE ...
) ranked
ORDER BY source_rank ASC, source ASC
LIMIT $limit OFFSET $offset;
```
*   **Round-Robin Interleaving:** Alternates records fairly across Greenhouse, Jobicy, and Lever (`GH #1 -> Jobicy #1 -> Lever #1 -> GH #2 -> ...`).
*   **Deterministic Pagination:** Pagination with `LIMIT` and `OFFSET` guarantees zero duplicates between adjacent pages.
*   **Sorting Preservation:** When the user selects explicit sorts (`Newest Posted`, `Oldest Posted`, `Match Score: High to Low`), the engine seamlessly switches to standard indexed ordering.

### 3. Automated Company Branding & Resilient Logos
Opportunity cards and detail pages render crisp company logos without relying on paid or fragile third-party APIs:
*   **Google Favicon V2 CDN:** Uses `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128` to fetch official, high-resolution brand icons.
*   **Curated Alias Dictionary:** Automatically maps known employer aliases (e.g. `Palantir Technologies` $\rightarrow$ `palantir.com`, `Cloudflare, Inc.` $\rightarrow$ `cloudflare.com`, `Ramp` $\rightarrow$ `ramp.com`, `Databricks` $\rightarrow$ `databricks.com`, `Roboflow` $\rightarrow$ `roboflow.com`).
*   **Dynamic Application URL Fallback:** If the company is unlisted, the resolver parses the root domain from the opportunity's `applicationUrl`.
*   **Zero-CLS Lettermark Fallback:** If an image fails to load or no domain can be deduced, `<CompanyLogo />` instantly renders an accessible initial tile (`aria-label="<Company> logo"`) with locked dimensions, preventing Cumulative Layout Shift.

### 4. Deterministic Opportunity Matching
Opportunities are matched against candidate profiles using an evidence-based skill evaluation algorithm:
*   Extracts required and preferred technical competencies from role specifications.
*   Scores candidates based on verifiable portfolio evidence, projects, and work experience.
*   Provides clear, transparent explanations of matched skills and missing prerequisites on each card and detail view.

---

## 🚀 Local Development Setup

### Prerequisites
*   **Node.js:** v20+ recommended
*   **npm:** v10+
*   **Docker Desktop:** For local PostgreSQL instances
*   **Clerk Account:** For authentication API keys

### Installation & Initialization

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-org/intelligence-engine.git
    cd intelligence-engine
    ```

2.  **Install dependencies**
    ```bash
    cd apps/api && npm install
    cd ../web && npm install
    ```

3.  **Configure Environment Variables**
    Create `.env` in `apps/api` and `apps/web` following `.env.example`:
    ```ini
    # apps/api/.env
    DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/intelligence_engine"
    CLERK_SECRET_KEY="sk_test_..."
    PORT=3001
    ```

4.  **Database Migration & Seeding**
    ```bash
    cd apps/api
    npx prisma generate
    npx prisma db push
    ```

5.  **Run Development Servers**
    ```bash
    # Terminal 1: Express API (Port 3001)
    cd apps/api
    npm run dev

    # Terminal 2: Next.js Frontend (Port 3000)
    cd apps/web
    npm run dev
    ```

---

## 🧪 Verification & Testing

The monorepo contains comprehensive automated test suites targeting an isolated test database (Port 5433):

```bash
# 1. Company Branding & Balanced Discovery Feed
cd apps/api
npx tsx src/testDiscoveryBrandingAndFeed.ts

# 2. Opportunity Matching & Candidate Scoring End-to-End
npx tsx src/testOpportunityMatchingEndToEnd.ts

# 3. Multi-Source Ingestion Pipeline (Jobicy, Greenhouse, Lever)
npx tsx src/testMultiSourceIngestion.ts

# 4. Ingestion Scheduler & Worker Daemon
npx tsx src/testIngestionScheduler.ts
```

To build all packages for production:
```bash
npm --prefix apps/api run build
npm --prefix apps/web run build
```

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or usage of this codebase is strictly prohibited.
*Built for the modern candidate.*
