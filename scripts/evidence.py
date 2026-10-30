"""Structured *candidate evidence* from official documents; NEVER compliance rulings.

No machine-learning model or API. Candidate extracts are explicitly unreviewed, and
page/section references are stored so humans can open the official primary source.
"""
from __future__ import annotations
import re

TOPICS = {
    "height": re.compile(r"\b(?:building height|maximum height|minimum height|maximum number of storeys|height of a building|height overlay)\b", re.I),
    "setbacks": re.compile(r"\b(?:setbacks?|front yard|rear yard|interior side yard|exterior side yard|angular plane|main wall)\b", re.I),
    "parking": re.compile(r"\b(?:parking spaces?|vehicle parking|parking rate|off.street parking|parking exemptions?|loading spaces?)\b", re.I),
    "uses": re.compile(r"\b(?:permitted uses?|prohibited uses?|permitted building types?|conditions for uses?)\b", re.I),
    "density": re.compile(r"\b(?:floor space index|lot coverage|landscaped open space|maximum floor area|minimum lot area)\b", re.I),
    "exceptions": re.compile(r"\b(?:site.specific exception|site.specific provisions?|prevailing by.law|interim control by.law|appeal|amendment)\b", re.I),
    "obc": re.compile(r"\b(?:major occupancy|building area|fire separation|means of egress|barrier.free|Part 9|Part 3|spatial separation|exits?)\b", re.I),
}
SECTION = re.compile(r"(?<!\d)(?:\d{1,3}\.){2,4}\d{1,3}(?!\d)")
# Not a list of "approved" zones. Only a hint for filtering evidence found
# literally in a primary source. A zone on its own cannot determine a rule.
ZONE_HINTS = re.compile(r"(?<![A-Za-z0-9])(?:MCC|CR|CRE|CL|CS|EL|EH|EO|R1|R2|R3|R4|R5|RM|RA|RT|RS|RD)(?![A-Za-z0-9])", re.I)


def compact(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def primary_section(text: str, pos: int) -> str:
    """A best-effort section locator, *not* a verified citation number."""
    hits = SECTION.findall(text[max(0, pos - 850):pos])
    return hits[-1] if hits else ""


def candidate_entries(page_text: str, source: dict, page_number: int, *, max_entries: int = 12) -> list[dict]:
    """Return auditable candidate passages; no numerical extraction or verdicts.

    Limit per page, dedupe overlaps, and tie each passage to the original
    official document. PDF page is viewer (1-based) page, not printed page.
    """
    text = compact(page_text)
    if not text:
        return []
    matches = []
    for topic, pattern in TOPICS.items():
        for hit in pattern.finditer(text):
            matches.append((hit.start(), hit.end(), topic))
    matches.sort()
    results, previous = [], []
    for start, end, topic in matches:
        if len(results) >= max_entries:
            break
        # Keep separate topics even when they overlap; avoid repeated excerpts.
        if any(existing_topic == topic and abs(existing_start-start) < 260 for existing_start, existing_topic in previous):
            continue
        lo = max(0, start-125)
        hi = min(len(text), end+470)
        passage = text[lo:hi].strip()
        section = primary_section(text, start)
        zones = sorted(set(v.upper() for v in ZONE_HINTS.findall(passage)))
        doc_url = source['url'] + (f'#page={page_number}' if source['type'] == 'pdf' else '')
        results.append({
            'doc_id': source['id'], 'jurisdiction': source['jurisdiction'],
            'title': source['title'], 'topic': topic, 'section_hint': section,
            'page': page_number, 'format': source['type'], 'zones_mentioned': zones,
            'chapter_zone_scope': source.get('zone_scope', '').upper(),
            'excerpt': passage, 'source_url': doc_url,
            'review_status': 'unverified_candidate',
        })
        previous.append((start, topic))
    return results


def match_zone_record(record: dict, raw_zone: str) -> bool:
    """Require bounded zone token; CR must not match CRE or MCC."""
    tokens = re.findall(r"[A-Z]+\d*", raw_zone.upper())
    if not tokens:
        return False
    primary = tokens[0]
    if primary in record.get('zones_mentioned', []) or primary == record.get('chapter_zone_scope'):
        return True
    # General jurisdiction-wide parking, OBC, and other cross-zone material
    # may still be shown, but only as GENERAL evidence, not property-specific.
    return record['topic'] in ('parking', 'obc', 'exceptions') and not record.get('zones_mentioned')
