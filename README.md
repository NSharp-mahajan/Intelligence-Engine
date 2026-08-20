# Career Intelligence 🚀

Career Intelligence is a deterministic matching engine for modern engineering careers. It replaces the traditional "black box" resume-parsing process with a verifiable, evidence-based system that scores candidate capabilities directly against real-world engineering roles. 

Stop searching. Start matching.

## 🌟 Key Features

*   **Evidence-Based Matching:** Candidates upload verified projects, GitHub repositories, and skill proofs instead of relying on keywords.
*   **Explainable Intelligence Engine:** The system doesn't just give a score; it breaks down *why* a match exists, highlighting verified requirements and explicitly noting skill gaps.
*   **Deterministic Evaluation:** No AI hallucinations. The matching algorithm relies on concrete, mathematical alignment between role requirements and candidate evidence.
*   **Telemetry Dashboard:** A high-end, data-dense UI/UX engineered for technical candidates, allowing them to track profile readiness, matched opportunities, and verified signals.

## 🏗️ Architecture

The platform is designed as a modern, full-stack Monorepo utilizing the following stack:

*   **Frontend:** [Next.js (App Router)](https://nextjs.org/) + React + TypeScript
*   **Backend:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) + TypeScript
*   **Database:** PostgreSQL (Dockerized)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Styling:** Custom CSS Variable / Token system built on raw CSS for maximum performance and highly-customizable telemetry UI themes.

## 📂 Project Structure

```
intelligence-engine/
├── apps/
│   ├── api/                # Express Backend
│   │   ├── src/
│   │   │   ├── routes/     # API Endpoints
│   │   │   ├── controllers/# Business Logic
│   │   │   └── middleware/ # Auth & Validation
│   │   └── prisma/         # Database Schema
│   └── web/                # Next.js Frontend
│       ├── app/            # App Router (Pages & Layouts)
│       └── components/     # Reusable UI & Interactive Data Visualizations
```

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm (v9 or higher)
*   Docker (for PostgreSQL)

### Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-org/intelligence-engine.git
    cd intelligence-engine
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # Note: Install dependencies in both apps/web and apps/api as needed.
    ```

3.  **Database Setup**
    Ensure Docker is running, then spin up the PostgreSQL container (if a docker-compose is provided, otherwise point Prisma to your local Postgres instance).
    ```bash
    cd apps/api
    npx prisma generate
    npx prisma db push
    ```

4.  **Environment Variables**
    Create a `.env` file in `apps/api` and `apps/web` referencing the `.env.example` templates provided in the respective directories.

5.  **Run Development Servers**
    Start both the frontend and backend servers.
    ```bash
    # Terminal 1 (Backend)
    cd apps/api
    npm run dev

    # Terminal 2 (Frontend)
    cd apps/web
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000` and the API at `http://localhost:3001`.

## 🎨 UI/UX Design System

The frontend employs a highly deliberate design language inspired by data-dense, technical analytics products:
- **Core Theme:** Warm off-white canvas, near-black typography, and strict, thin borders.
- **Accents:** Semantic Green for verified requirements and Orange for primary interaction and match scores.
- **Components:** Built with a proprietary set of `ui/` primitives (`Button`, `Card`, `Badge`, `Input`) designed to feel like precision instruments rather than marketing fluff.

## 🛡️ Authentication

Authentication is handled securely via server-side database sessions utilizing `HttpOnly` cookies. No JWTs are exposed to the client, ensuring robust defense against XSS attacks.

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or usage of this codebase is strictly prohibited.

---
*Built for the modern candidate.*
