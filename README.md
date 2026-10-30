# Lotwise v0.5 — Official evidence explorer

**Open-source / no-install / GitHub Pages / official-source-only.**

Lotwise is a *preliminary* Ontario property zoning research workspace. It is **not** a zoning certificate, interpretation by a licensed professional, or Ontario Building Code compliance determination.

## What is new in v0.5

- An **Official evidence** panel below Development standards, filtered by **Height, Setbacks, Parking, Permitted uses, Coverage/FSI, Exceptions**. When a zoning candidate is confirmed, Lotwise looks up the most relevant passages in an index produced from official sources.
- GitHub Actions automatically retrieves listed official HTML/PDF documents and derives `site/data/evidence.json`, without requiring website visitors to install Python or download documents.
- Each candidate includes its topic, document title, possible section number, page / text-block locator, source link and an **UNVERIFIED** label. General/zone-mentioned/chapter-scoped texts are distinguished.
- Includes additional verified official Toronto by-law documents for R and CRE categories. The source manifest is deliberately finite and approved-host-only, not a third-party web search.
- Unit tests for official source allowlists, candidate generation, bounded zoning labels, provenance and safe empty-state behavior. The GitHub workflow runs tests before deployment.

**Important:** This version adds *document discovery and candidate tagging*, not fully automated regulatory interpretation. It does not compute final allowable height, setbacks, permitted uses, parking, occupancy, or zoning compliance from new documents. Existing reviewed base standards still exist for previously supported cases; their exceptions are not automatically resolved.

## Install / update your existing GitHub Pages repository

1. Extract this ZIP locally.
2. Replace/update the matching **folders and files** in your public `lotwise` repository, preserving paths (especially `site/`, `scripts/`, `tests/`, `.github/workflows/pages.yml`). Do **not** upload the ZIP as one file.
3. Commit to `main`. The `Publish Lotwise and refresh official sources` GitHub Action will install `pypdf` on GitHub's runner, execute tests, refresh official documents, build the evidence index and publish the `site/` folder.
4. Open your `https://<username>.github.io/lotwise/` site. In the Source freshness panel, check **Index state / Last synchronized**. A source fetch can fail; its missing passages will be shown as missing, never inferred to be permission.
5. To test immediately, go to **Actions → Publish Lotwise... → Run workflow**, then examine the last run logs and website after deployment.

You do not need to install Python. There are no paid AI API keys or accounts for visitors.

### Expected test cases

- Toronto: `522 Mount Pleasant Rd` → `CR SS2 (x531)` and a height overlay record. The *Official evidence* panel should find candidate passages from CR Chapter 40; site-specific exception x531, amendments and overlays must still be checked.
- Brantford: `5 Woodyatt Dr` → `MCC`; standard MCC general-table reference still appears in Development standards. The new evidence panel may show MCC page mentions and general parking provisions where the official document was indexed successfully.
- A new, unreviewed zone → expect candidate evidence **if indexed text actually matches**, not guessed numerical restrictions.

## How indexing works

`site/data/sources.json` holds allowlisted **official** HTML/PDF URLs. At deployment `scripts/sync_sources.py` checks exact allowed hosts and redirects, downloads the material, and produces:

- `site/data/index.json`: searchable short text navigation snippets (legacy source library).
- `site/data/evidence.json`: machine-tagged but **unverified** candidate paragraphs with primary-source URLs.
- `site/data/status.json`: refreshed document status, time and errors.

The browser reads the published static JSON. There is **no live Python backend** and **no general web search** available in GitHub Pages. Adding a new city's regulations requires a reviewed source connector or source-list entry. A PDF with poor text layout or scans might not be extracted; no OCR is performed.

If the deployment cannot download a PDF or official HTML, its evidence may be absent. At present the GitHub Actions deployment publishes a fresh index as an artifact rather than committing cached extracted data back to the source repository; previous successful evidence is **not guaranteed** to survive an unsuccessful source fetch. See the status panel and action logs before relying on completeness.

## Privacy and limitations

- No user account, no app analytics, and no user brief sent to a Lotwise server. Addresses/coordinates are transmitted to the relevant **official municipal GIS** endpoints for matching.
- Zoning is an address-point intersection, not a legal parcel boundary determination.
- Some official consolidated by-laws lag amendments, appeals or interim controls. This app never treats 'no search result' as 'no regulation'.
- Text retrieval and regex category tagging can identify a passage about parking or height, but cannot establish which conditions or overrides apply. Open the original regulation and conduct professional review.
- The OBC panel remains a **preliminary applicability screen**; not an exit, fire-resistance, barrier-free or Part 3/Part 9 compliance checker.

## Development tests

```sh
python -m pip install 'pypdf>=5,<7'
python -m unittest discover -s tests -v
python scripts/sync_sources.py --check-only
python scripts/sync_sources.py
```

The last command contacts official sources. It is run by GitHub Actions, **not by end users**. The official-domain allowlist is in `scripts/sync_sources.py` and the frontend host allowlist is in `site/app.js`.

**License:** MIT (`LICENSE`).
