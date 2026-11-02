"""Conservative, source-linked rule candidates for official zoning text.

This module extracts research leads, NOT legally applicable zoning standards.
A quantity is reported only when it is present in the same source line or
immediately following a requirement phrase. Applicability/exception logic is
never inferred from a number alone. Every record is marked NEEDS_REVIEW.
"""
from __future__ import annotations
import re

PATTERNS = {
    "height": re.compile(r"\b(?:maximum|minimum|permitted)?\s*(?:building\s+)?height\b", re.I),
    "front_yard": re.compile(r"\b(?:minimum|required|maximum)?\s*front\s+(?:yard|setback)\b", re.I),
    "rear_yard": re.compile(r"\b(?:minimum|required|maximum)?\s*rear\s+(?:yard|setback)\b", re.I),
    "interior_side_yard": re.compile(r"\b(?:minimum|required|maximum)?\s*interior\s+side\s+(?:yard|setback)\b", re.I),
    "exterior_side_yard": re.compile(r"\b(?:minimum|required|maximum)?\s*exterior\s+side\s+(?:yard|setback)\b", re.I),
    "coverage": re.compile(r"\b(?:maximum|minimum)?\s*(?:lot\s+coverage|landscaped\s+open\s+space|floor\s+space\s+index|floor\s+area\s+ratio)\b", re.I),
    "parking": re.compile(r"\b(?:minimum|required|maximum)?\s*(?:vehicle\s+)?parking\s+(?:spaces?|requirement|rate)\b", re.I),
}
VALUE = re.compile(r"(?<![A-Za-z0-9])(?:\d+(?:\.\d+)?\s*(?:m²|sq\.?\s?m|metres?|meters?|m\b|%|storeys?|stories|spaces?\b)|NR\b|No\s+Requirement\b)", re.I)
ZONE = re.compile(r"(?<![A-Z0-9])(?:MCC|CR|CRE|CL|CS|EL|EH|EO|R1|R2|R3|R4|R5|RM|RA|RT|RS|RD)(?![A-Z0-9])", re.I)
CONDITIONAL = re.compile(r"\b(?:except|unless|where|if|provided|subject to|abutting|adjacent|notwithstanding|alternatively|greater of|lesser of)\b", re.I)


def compact(text):
    return re.sub(r"\s+", " ", text).strip()


def extract_rule_candidates(page_text: str, source: dict, page_number: int, limit=24) -> list[dict]:
    """Extract quantified nearby text and exact source pointers without interpretation.

    PDF lines are kept separate; for HTML, page_text may be a short word block.
    Text without a unit/NR marker is not presented as a numeric candidate.
    """
    lines = [compact(x) for x in page_text.splitlines() if compact(x)]
    if not lines:
        return []
    result, seen = [], set()
    is_pdf = source.get('type') == 'pdf'
    for i, line in enumerate(lines):
        for topic, pattern in PATTERNS.items():
            hit = pattern.search(line)
            if not hit:
                continue
            # Keep nearby text to catch split PDF table rows, but don't cross
            # long paragraph boundaries or derive a rule from the next clause.
            tail = line[hit.start():hit.start() + 190]
            if is_pdf and len(tail) < 180 and i + 1 < len(lines):
                following = lines[i + 1]
                if len(following) <= 140 and not any(p.search(following) for p in PATTERNS.values()):
                    tail += ' | ' + following
            values = list(dict.fromkeys(m.group().strip() for m in VALUE.finditer(tail)))[:5]
            if not values:
                continue
            excerpt = compact(line[:350])
            if is_pdf and ' | ' in tail:
                excerpt = compact(excerpt + ' | ' + lines[i + 1][:120])
            key = (topic, tuple(values), excerpt[:90])
            if key in seen:
                continue
            seen.add(key)
            zone_mentions = sorted(set(z.upper() for z in ZONE.findall(' '.join(lines[max(0, i - 2): i + 1]))))
            scope = source.get('zone_scope', '').upper()
            result.append({
                'doc_id': source['id'], 'jurisdiction': source['jurisdiction'],
                'title': source['title'], 'topic': topic,
                'values_as_written': values, 'context': excerpt[:420],
                'conditional_text_present': bool(CONDITIONAL.search(excerpt)),
                'zones_mentioned': zone_mentions, 'chapter_zone_scope': scope,
                'source_url': source['url'] + (f'#page={page_number}' if is_pdf else ''),
                'page': page_number, 'source_format': source['type'],
                'review_status': 'needs_manual_review',
            })
            if len(result) >= limit:
                return result
    return result


def applies_as_research_lead(record, zone, jurisdiction):
    """Allow source-scope or explicitly mentioned zone. No application verdict."""
    if record.get('jurisdiction') != jurisdiction:
        return False
    match = re.match(r'^([A-Za-z]+\d*)\b', zone.strip())
    if not match:
        return False
    primary = match.group(1).upper()
    return primary == record.get('chapter_zone_scope') or primary in record.get('zones_mentioned', [])
