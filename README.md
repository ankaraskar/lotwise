# Lotwise v0.4 — Site Intelligence

A free, open-source, static GitHub Pages prototype for preliminary site zoning and Ontario Building Code research. **No install, Python or paid AI API is required for website visitors.**

## What's new in 0.4

- Redesigned English-first, responsive desktop/mobile interface with top-of-page **Zoning / Height / Setbacks / Parking** snapshot cards.
- Toronto CR SS2: links to official Chapter 40.10 and shows general front, rear, side setback conditions (which require site context), applicable GIS height when present, and exception x531 warning.
- Brantford MCC: curated official Table 6.6.1 building standards separated into non-residential vs mixed/residential building types, with conditional footnotes.
- Brantford indicative parking base rates where a single supported use is selected. Automobile sales calculation separately uses non-service GFA and service bays.
- **Ontario Building Code initial screening:** scope of work, provisional major occupancy, storeys and *building area* (not GFA), with an advisory on possible Part 9 vs Part 3 review and an action checklist. References current O. Reg. 163/24 and official Compendium.
- GitHub Actions official-government-only document index now includes Ontario OBC scope and legal regulation pages.
- Uses system fonts; the website has no runtime third-party fonts, trackers, or AI services.

## Publish changes to your existing GitHub Pages repository

1. Unzip and upload the **contents**, preserving paths, to your GitHub repository (`main`). The root must contain `.github/`, `scripts/`, `site/`, `tests/`, and the README files. **Do not upload only a ZIP**, or nest everything inside an extra `Lotwise_v0.4/` directory.
2. **Preserve / update `.github/workflows/pages.yml`** to retain the indexing and Pages deployment workflow. Browser users never need Python; GitHub's hosted Actions runner runs the indexing script.
3. Commit the changes and review the **Actions** tab. In your repo's **Settings > Pages**, Source should be **GitHub Actions**.
4. Visit `https://YOUR_USERNAME.github.io/lotwise/`. Hard-refresh with `Ctrl + Shift + R` if you see a cached old page.
5. Confirm Toronto and Brantford GIS addresses, and enter the **Proposed use** + GFA for the parking panel. For OBC, select occupancy and **building area** rather than total GFA.

## Current capabilities and limits

### Official GIS and data

Property address-point intersection from pinned City of Toronto and City of Brantford ArcGIS layers. Toronto height/coverage/policy overlays and Brantford Schedule D/B point queries. This is not property boundary verification. The Municipalities' GIS endpoint has to permit browser cross-origin requests.

### Zoning research (not a determination)

Only **Toronto CR SS2 (with conditional rules)** and **Brantford MCC** have particularly detailed structured references. Other zone categories explicitly show *not indexed/review required*. A generic official-document excerpt search is available in Source library, but it is **not** a comprehensive zoning interpretation engine. The official zoning table may be superseded by amendments, exceptions, appeals or site circumstances.

### OBC

Scope screening based on Ontario's current official [O. Reg. 163/24](https://www.ontario.ca/laws/regulation/240163) and the [2024 Building Code Compendium, Division A, Article 1.3.3.3](https://www.ontario.ca/document/2024-building-code-compendium/part-1-compliance). The 2024 Compendium HTML has at times lagged the **latest regulation amendments**; check the current e-Laws consolidation and official amendment text. Screening is **not an OBC compliance analysis**: mixed occupancies, Part 11, fire protection, exits, accessibility, and other provisions still require professional review. The user selects a *provisional* major occupancy; the app does not infer one from a colloquial use name.

### Parking

A rate shown here is a **general base-rate example**, not a legally required parking count. The calculation remains unrounded until exemptions, mixed uses, Schedule D, accessible parking, other by-laws, and amendments have been verified. Toronto does not yet calculate Chapter 200 parking counts.

### Security and privacy

Research sources are pinned to approved official government hosts, with URL restrictions in both the browser and GitHub Actions indexing script. Survey and brief text is not uploaded to any Lotwise server. GIS lookups necessarily transmit the selected address/coordinates to the municipal GIS endpoint. Keep sensitive project files out of public GitHub repositories.

## Developer checks

```sh
python scripts/sync_sources.py --check-only
python -m unittest discover -s tests -v
node --check site/app.js
```

GitHub Actions uses Python with the free and open-source `pypdf` library to refresh document excerpts. If an official fetch fails, the index records a warning and can retain clearly marked stale evidence; it does **not** invent results.

## License

MIT. Preliminary research only; not a zoning certificate, permit approval, architect's certification, or professional code opinion.
