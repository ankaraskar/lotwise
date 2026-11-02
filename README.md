# Lotwise v0.7 — Official Rule Research + Blue Design System

**Lotwise** is a free, public, open-source **preliminary zoning research** site. It can be published to GitHub Pages, with a Python-based official-document indexer running in GitHub Actions rather than on users' computers. The site contains no external AI API or user account requirement.

## v0.7 changes

1. **No duplicate “At a Glance.”** Search by address → municipal GIS match → **one** Development Standards section. Source details, code screening and candidate rule extractions are expandable when needed.
2. **Visual system:** blue **#0B396D**, white **#FFFFFF**, cool near-white **#F4F7FB**, readable dark text **#0B2745**. Inspired solely by the supplied colour reference; **no corporate name, logo or other brand assets**.
3. **Type scale:** 16px body/field text and standards; 15px labels; 14px notes and citations; 12–13px only for incidental metadata; section headings 19–25px. At narrow widths, rule labels and values stack rather than becoming tiny.
4. **Official numerical research candidates:** `scripts/rule_candidates.py` attempts to locate explicitly numbered height, yard, coverage and parking passages. They are **always unverified** and never used as a property-specific compliance value. Each result retains the original official URL, PDF viewer page when available, category and qualification warning.
5. **Versioned publication pipeline:** the existing Actions workflow runs the indexer and deploys `site/data/rule_candidates.json` with the website. Old index values are retained as marked stale when an official source fails to refresh.
6. **Convenience:** source index loading now updates the visible standards if an address search finished first; proposed-use details are revealed from the parking section when needed.

## Deploy to existing GitHub Pages

1. Download and extract the ZIP.
2. Replace matching files in the **root** of your GitHub repository, preserving `.github/workflows/`, `scripts/`, `site/`, and `tests/` folders. Do **not** upload the ZIP as one file or nest everything under a version folder.
3. Commit to `main`. Open **Actions → Publish Lotwise and refresh official sources**. The publisher must succeed.
4. Visit your Pages site and hard refresh (`Ctrl+Shift+R`).

No Python, PDF downloads, API keys, or command line are required for website visitors. Python is used only on GitHub's hosted runner.

## Scope and safety

- Toronto and Brantford are the initial GIS targets. Approved municipality-maintained ArcGIS service addresses are fixed in source code. The document indexer allows only listed Ontario/municipal government HTTPS sources and blocks off-allowlist redirects.
- Base standards still cover **selected** known zones (not every possible zone). Other zone codes may receive **official research leads** but **not automatically confirmed site-specific setbacks, height or parking counts**.
- A zoning map point is not a legal survey. Exceptions, amendments, appeals, standards variations and the exact proposed use can change applicable figures. OBC remains preliminary screening, not a code verdict.
- Government documents can fail to download or change structure; the UI must never treat missing records or unparsed text as permission to build.
- Project details remain client-side; **the searched address/coordinates are transmitted to the corresponding government GIS endpoint**.

## Tests (developer-only)

```bash
python -m unittest discover -s tests -v
python scripts/sync_sources.py --check-only
node --check site/app.js
```

GitHub Actions runs the Python tests and officially allowed source checks before deployment. External live GIS and PDF ingestion are not guaranteed by local unit tests; inspect the deployed index status.

MIT license.
