# Lotwise v0.3

**Official-source-only, open-source preliminary zoning research.**

Lotwise is a GitHub Pages website for early-stage architectural site feasibility studies. It has **no login, no paid AI API and no Python requirement for website users**. The website is in English. The underlying source-indexing script runs on GitHub's hosted runner, not on anyone's computer.

> **Research prototype, NOT a zoning certificate or a professional compliance determination.** All results must be checked against the applicable by-law, site-specific exceptions, zoning amendments/appeals, survey and other law. Where the app cannot establish a provision, it says so.

## Deploy with GitHub (no coding on your computer)

1. [Create a **public** GitHub repository](https://github.com/new), e.g. `lotwise`. Do not add a generated README because this package already has one.
2. Upload the **contents** of this package to the repository, preserving the folder names (including hidden `.github/workflows/pages.yml`). Uploading a `.zip` as one file is **not** sufficient. You can use GitHub's **Add file → Upload files** in a supported browser; if it does not preserve subfolders, use the GitHub web editor to add the indicated paths.
3. In the repository, choose **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open **Actions → Publish Lotwise and refresh official sources → Run workflow** if it has not already run on the first push.
5. Once the workflow deploys, open `https://YOUR-USERNAME.github.io/lotwise/` (replace account/repo names as appropriate).

Pages is free for public repositories subject to GitHub's current terms and limits. Scheduled indexing is best effort. The Actions runner needs internet access to government domains. Site users do not run Python or download any PDFs.

## What works in v0.3

- English-only polished responsive interface and direct GIS lookup by address / coordinates.
- **Toronto:** official Toronto Address Point Layer 101 → Zoning Property Summary Layer 18 (fallback Layer 3), plus Height (9), Lot Coverage (10) and Policy (13) overlays.
- **Brantford:** City-published ArcGIS address points and Schedule A zoning polygons; optional layer checks. Because the GIS is hosted by Esri, `services.arcgis.com/aji2lCmjXt0KpGzI` is an **explicitly pinned City of Brantford GIS service**, not an internet-wide search.
- Large **Confirm this property** control; the app does not assume which point represents the surveyed legal parcel.
- Brantford **MCC base standards** from Table 6.6.1, with separate columns by building type; a limited reference list of Section 5 parking rates.
- General-purpose official-document **text excerpt index** built by GitHub Actions from an approved list of government PDFs/pages. Results link to the original document and page.
- Print/save report to PDF using the browser; checklist distinguishes point match from provisions requiring review.

## Not yet implemented (important)

- Complete, automatically validated rules for **every** Toronto/Brantford zone, every amendment and every building use.
- Legally reliable parking totals (exceptions, mixed use, accessible spaces, rounding and loading).
- Formal OBC compliance, geospatial parcel/survey matching, official zoning certification.
- A robust PDF *table-to-structured-standards* pipeline (the weekly job builds a **searchable navigation index**, not complete zoning rule objects).
- Guaranteed cross-origin browser access to all government GIS endpoints; municipal CORS policies may change. On a blocked request, the interface reports the failure rather than fabricating results.

This is an honest MVP: it solves **zero-install access, automatic official document retrieval, constrained sources, source traceability and property confirmation**. The next milestone is a reviewed rules importer to populate all districts instead of relying on manually curated tables.

## Official-only source policy

- `site/data/sources.json` contains an **explicit, reviewed list** of government sources. The indexer only fetches HTTPS pages/PDFs from the hosts hard-coded in `scripts/sync_sources.py`.
- Redirect destinations are rechecked against the allowlist. Non-government sites and search-engine snippets cannot enter the index.
- The browser queries **pinned City-published GIS endpoints** and never sends the client brief or GFA to any backend. An address/coordinate is necessarily transmitted to the relevant official GIS endpoint; there is no server-side project storage.
- Source citations, publication/version dates, index build times and warnings are preserved. Failed updates are marked stale or unavailable; missing data never means a by-law does not apply.
- Municipalities may amend by-laws after publication of consolidated documents. Confirm updates from the appropriate municipality.

## Free/open-source technology

Vanilla HTML/CSS/JavaScript, Python 3 for GitHub Actions, [pypdf](https://github.com/py-pdf/pypdf) for PDF text extraction, no third-party client-side JS/CDN dependencies. Source code licensed under MIT; official government documents retain their respective publishers' rights.

### Local development (optional; website users don't do this)

```bash
python -m http.server --directory site 8080
python -m unittest discover -s tests -v
python scripts/sync_sources.py --check-only
```

Static site: `http://localhost:8080/`. Running a local server is optional for developers only. GitHub Actions installs pypdf automatically to process official PDFs. Any change to the official source list requires a deliberate code review.

## Project folders

- `site/` — deployed GitHub Pages site; all browser-side client-side logic.
- `site/data/` — allowed source manifest, provision references, generated index and health status.
- `scripts/sync_sources.py` — safe government-only download / PDF text navigation indexing.
- `.github/workflows/pages.yml` — weekly scheduled update and GitHub Pages deployment.
- `tests/` — safety and functional checks.

## Privacy & publishing warning

Do not commit client Survey files, private designs or customer briefs to a public repository. This starter has **no upload-to-server** feature. For commercial client-facing production, confirm suitability of GitHub Pages hosting and add an appropriate authentication and data protection plan before storing any project information.

## v0.3 changes (30 October 2026)
- Toronto CR SS1–SS5: official chapter links, dynamic HT_HEIGHT and HT_STORIES display if provided by official height overlay; no automatic claim of legal allowable height where exceptions are unknown.
- Toronto CR x531: links to Chapter 900 and By-law 595-2022; warnings concerning referenced exceptions.
- Brantford parking: auto-matches unambiguous Proposed Use values; includes automobile dealership formula (non-service GFA + service bays) and automobile repair garage (service bays only); common rates visible even without a selected use.
- Weekly official document index includes Toronto CR, parking, CR exceptions and amendment pages. HTML chapters are chunked into searchable sections rather than indexing just their first few keywords.
- No paid APIs, no Python requirement for website visitors, no third-party government-law sources.

### Updating existing GitHub Pages deployment
Replace the files under `site/` and `scripts/` in the existing repository, keeping `.github/workflows/pages.yml`. Trigger **Actions → Publish Lotwise and refresh official sources → Run workflow**; the weekly job will rebuild the expanded official-document index. Do not upload private client files to the public repo.

**Not implemented:** general-purpose parsing of all zoning rules for all municipalities, verification of current site-specific appeals, legally reliable parking counts, or a complete OBC checker.
