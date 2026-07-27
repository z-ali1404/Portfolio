# Clinical Trials Evidence Dashboard

Live Demo - [portfolio-zain-1812.vercel.app](https://portfolio-jkwq4vj3b-zain-1812.vercel.app/)

A structured evidence-review dashboard for clinical trial data, built directly on top of the
public [ClinicalTrials.gov v2 API](https://clinicaltrials.gov/data-api/api). It searches the live
registry of 500,000+ studies and presents each trial as an enhanced, expandable abstract - summary
first, methodology and validity signals on demand.

![Tech](https://img.shields.io/badge/React-18-149eca) ![Tech](https://img.shields.io/badge/TypeScript-5-3178c6) ![Tech](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Tech](https://img.shields.io/badge/Vite-5-646cff)

## Problem

Research abstracts are easy to scan, but often don't provide enough detail to judge whether a
clinical trial's methods and statistical approach are strong enough for confident evidence review.
Reviewing a single study usually means jumping between the registry summary, the design module, the
eligibility criteria, and the outcomes section — and even then it's easy to lose track of whether
the trial was randomized, blinded, controlled, or adequately powered.

## Solution

This dashboard keeps the clarity of an abstract while layering in deeper trial information from the
ClinicalTrials.gov v2 API, letting users search and inspect studies in a more structured,
reviewer-friendly way. Every result is a real, live study — there is no hardcoded or mocked trial
data anywhere in the app.

The centerpiece is the **Evidence Review** panel: a transparent, rule-based layer that translates
raw registry fields (allocation, masking, arm structure, enrollment count, phase, status) into a
structured methodology snapshot — without ever inventing a fact or rendering a "good/bad" verdict.

## Features

- **Live search against the real registry** — keyword, condition, intervention, sponsor, and NCT ID
  search, backed by `query.term` / `query.cond` / `query.intr` / `query.spons` / `query.id`.
- **Intelligent search box** — typing a valid NCT ID (e.g. `NCT04280705`) automatically switches
  the query to an exact ID lookup instead of a free-text search.
- **Filtering** by recruitment status, phase, and study type (interventional vs. observational),
  plus sorting by relevance, most recently updated, largest enrollment, or most recently started.
- **Trial cards as enhanced abstracts** — title, NCT ID, conditions, sponsor, phase, status, study
  type, enrollment, last-updated date, and a brief summary, scannable at a glance.
- **Expandable detail sections per trial**, fetched on demand from the study detail endpoint:
  Background, Study Design & Methodology, Enrollment, Primary/Secondary Outcomes, Eligibility
  Criteria, Arms & Interventions, Status & Timeline, Sponsor & Collaborators, and Locations.
- **Evidence Review / Validity Snapshot** — the key differentiator (see below).
- **Thoughtful UX** — skeleton loaders, empty/error states, debounced auto-search, "Load more"
  pagination via the API's page token, dark/light mode, and a responsive layout.
- **Graceful degradation** — every field is optional-chained; a study missing half its modules
  still renders cleanly with "Not reported" / "Not clearly stated" instead of breaking.

## The Evidence Review layer

For each study, an "Evidence Review" panel surfaces structured, non-diagnostic indicators:

| Signal | Derived from |
|---|---|
| Randomization | `designModule.designInfo.allocation` |
| Blinding | `designModule.designInfo.maskingInfo.masking` |
| Comparator / control structure | `armsInterventionsModule.armGroups[].type` |
| Enrollment scale (small / moderate / large) | `designModule.enrollmentInfo.count` |
| Phase context (early-phase / confirmatory / post-marketing) | `designModule.phases` |
| Recruitment state (+ caution flag) | `statusModule.overallStatus` |
| Results posted | `hasResults` |

Rules, deliberately kept simple and explicit (see `src/lib/evidenceReview.ts`):

- Enrollment `< 50` → small · `50–300` → moderate · `> 300` → large
- Phase `1` / Early Phase 1 → early-phase · Phase `2` → mid-phase · Phase `3` → later-phase /
  confirmatory · Phase `4` → post-marketing
- `TERMINATED` / `WITHDRAWN` / `SUSPENDED` status → a visible caution banner, surfacing the
  registry's stated reason when available
- If a field isn't present or isn't one of the recognized enum values, the output is literally
  **"Not clearly stated"** — never a guess

Every study also gets one cautious, hedged **interpretation sentence** (e.g. "the registry
describes this trial as randomized, double-blind, placebo-controlled; in general, this design is
considered by reviewers to support stronger causal confidence... though this snapshot does not
evaluate execution quality or actual results"). This is explicitly framed as a **review aid, not
medical advice** — the app never claims to determine whether a trial is "good" or "bad."

## Tech stack

- **React 18 + TypeScript** — [Vite](https://vitejs.dev) for tooling
- **Tailwind CSS** for styling (neutral slate palette + a single restrained teal accent)
- **Native `fetch`** for all data access — no data-fetching library needed
- **No backend** — the ClinicalTrials.gov v2 API is CORS-enabled, so the app calls it directly from
  the browser

## Project structure

```
src/
├── api/
│   └── clinicalTrialsApi.ts       # Builds query params, calls /studies and /studies/{NCT_ID}
├── lib/
│   ├── parseStudy.ts              # Raw nested JSON -> safe domain objects (TrialSummary/Detail)
│   ├── evidenceReview.ts          # Rule-based Validity Snapshot logic
│   └── formatters.ts              # Date / enrollment / status / phase display formatting
├── hooks/
│   └── useTrialSearch.ts          # Search + filter + pagination state, debounced auto-search
├── types/
│   └── clinicalTrials.ts          # Raw API types + domain model types
├── context/
│   └── ThemeContext.tsx           # Dark/light mode
├── components/
│   ├── layout/                    # Header, Footer
│   ├── search/                    # SearchBar, AdvancedSearch, FilterBar
│   ├── results/                   # ResultsSummary, TrialList, TrialCard, skeletons, empty/error states
│   ├── detail/                    # DetailSection accordion, EvidenceReviewPanel, per-module sections
│   └── ui/                        # Badge, Button, ThemeToggle
├── App.tsx
└── main.tsx
```

## API notes

ClinicalTrials.gov v2 study records are deeply nested under `protocolSection`. This app:

- Requests only the modules a result card needs on the search call (via the `fields` param) to
  keep list responses fast, then fetches the **full** record from `/studies/{NCT_ID}` only when a
  card is expanded — a realistic "summary first, deeper on demand" data-fetching pattern.
- Uses `filter.overallStatus` for recruitment status, and builds an
  [Essie](https://clinicaltrials.gov/data-api/about-api/search-areas) expression via
  `filter.advanced` (e.g. `AREA[Phase](PHASE2 OR PHASE3) AND AREA[StudyType]INTERVENTIONAL`) for
  phase and study type, since those aren't first-class `filter.*` params in the public API.
- Always passes `countTotal=true` so the UI can show a real result count, not just "20+".

## Running it locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`). No API key, `.env` file, or
backend is required — the app talks to `https://clinicaltrials.gov/api/v2` directly.

```bash
npm run build      # type-checks and builds a production bundle
npm run preview    # serves the production build locally
npm run typecheck  # type-check only
```

## Why I built it

I kept running into the same friction reviewing trial evidence: abstracts are fast to read but too
thin to judge methodology, and the full registry record is thorough but scattered across a dozen
nested sections. I wanted one place that kept the speed of an abstract but let me drill into
design, endpoints, and eligibility without losing my place — and that made the trial's
methodological signals (randomized? blinded? controlled? what phase? what enrollment size?)
visible up front instead of buried in prose.

## Future improvements (v2)

- Paper / PDF ingestion, so a linked publication can be reviewed alongside the registry record
- Trial comparison mode — view 2–3 studies side by side
- Saved review notes per NCT ID (local storage or a lightweight backend)
- Export a trial's evidence snapshot to CSV/PDF
- AI-assisted summarization of the detailed description and eligibility text
- Stronger evidence-review logic — e.g. cross-referencing enrollment against the primary outcome's
  statistical power where reported, or flagging protocol amendments

## Disclaimer

This tool structures publicly available registry data for faster review. It does not provide
medical advice, does not evaluate clinical validity or trial quality, and does not diagnose,
treat, or recommend any medical decision.
