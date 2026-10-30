#!/usr/bin/env python3
"""Scheduled official-only document index builder for Lotwise.

No project data, geocoding, paid APIs or non-official search engines.
Fail closed on unapproved hosts and redirect destinations. PDF excerpts are short
and for document navigation, not independent authority or completeness.
"""
import argparse
import datetime as dt
import hashlib
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
ALLOW = {"www.buildbrantford.ca", "www.toronto.ca", "www.ontario.ca", "www.e-laws.gov.on.ca"}
KEYWORDS = re.compile(r"\b(?:parking|setback|height|coverage|front yard|rear yard|interior side yard|permitted uses|site.specific|exception|amendment|appeal|interim control|MCC|development standards|loading|lot area)\b", re.I)
MAX_BYTES = 45 * 1024 * 1024


def safe_official(url):
    p = urllib.parse.urlsplit(url)
    return p.scheme == "https" and (p.hostname or "").lower() in ALLOW and not p.username and not p.password


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not safe_official(newurl):
            raise ValueError("Blocked redirect outside official source allowlist: " + newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OPENER = urllib.request.build_opener(SafeRedirect())


def fetch(url):
    if not safe_official(url):
        raise ValueError("Not an allowed official source: " + url)
    request = urllib.request.Request(url, headers={"User-Agent": "Lotwise-Official-Source-Indexer/0.1 (+public open source research tool)"})
    with OPENER.open(request, timeout=45) as resp:
        if not safe_official(resp.url):
            raise ValueError("Final URL is not allowed: " + resp.url)
        content_length = int(resp.headers.get("Content-Length", 0))
        if content_length > MAX_BYTES:
            raise ValueError("Document exceeds maximum size")
        data = resp.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Document exceeded read limit")
        return data, resp.url


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "nav", "footer"):
            self.skip += 1
    def handle_endtag(self, tag):
        if tag in ("script", "style", "nav", "footer") and self.skip:
            self.skip -= 1
    def handle_data(self, data):
        if not self.skip and data.strip():
            self.parts.append(data)


def extract_pages(blob, kind):
    if kind == "html":
        parser = PlainText()
        parser.feed(blob.decode("utf-8", "replace"))
        # Split large official HTML chapters into bounded searchable blocks.
        # Avoid keeping only the first three matches from a 30,000-line chapter.
        words = " ".join(parser.parts).split()
        return [(i // 320 + 1, " ".join(words[i:i+320])) for i in range(0, len(words), 320)]
    if kind == "pdf":
        if not blob.startswith(b"%PDF"):
            raise ValueError("Downloaded content is not a PDF")
        from pypdf import PdfReader
        pdf = PdfReader(io.BytesIO(blob))
        return [(i + 1, page.extract_text(extraction_mode="layout") or "") for i, page in enumerate(pdf.pages)]
    raise ValueError("Unknown document type")


def snippets(page_text, max_per_page=3):
    clean = re.sub(r"\s+", " ", page_text).strip()
    if not clean:
        return []
    found = []
    for match in KEYWORDS.finditer(clean):
        lo, hi = max(0, match.start() - 75), min(len(clean), match.end() + 145)
        if any(lo < old[1] + 45 for old in found):
            continue
        found.append((lo, hi, clean[lo:hi].strip()))
        if len(found) >= max_per_page:
            break
    return [s[2] for s in found]


def update_data(offline=False):
    data = json.loads((DATA / "sources.json").read_text(encoding="utf8"))
    current = json.loads((DATA / "index.json").read_text(encoding="utf8"))
    cached_docs = {d["id"]: d for d in current.get("documents", [])}
    cached_snips = current.get("snippets", [])
    docs = []
    out = []
    warns = []
    stamp = dt.datetime.now(dt.timezone.utc).isoformat()
    if offline:
        # Ensure this code path can be checked without touching government servers.
        for s in data["documents"]:
            if not safe_official(s["url"]):
                raise ValueError("Source allowlist failed for " + s["url"])
        print("Official source allowlist checked (offline)")
        return
    for source in data["documents"]:
        if not safe_official(source["url"]):
            raise ValueError("Unapproved source in manifest: " + source["url"])
        try:
            raw, resolved = fetch(source["url"])
            sha = hashlib.sha256(raw).hexdigest()
            pages = extract_pages(raw, source["type"])
            row = {**source, "resolved_url": resolved, "sha256": sha, "checked_at": stamp,
                   "page_count": len(pages), "status": "downloaded_and_indexed"}
            docs.append(row)
            for page, text in pages:
                for excerpt in snippets(text):
                    out.append({"doc_id": source["id"], "title": source["title"],
                                "jurisdiction": source["jurisdiction"], "page": page,
                                "content_type": source["type"], "excerpt": excerpt, "source_url": resolved + (f"#page={page}" if source["type"] == "pdf" else "")})
            print(f"Indexed {source['id']}: {len(pages)} page(s)")
        except Exception as exc:
            msg = f"{source['id']} could not be refreshed: {exc}"
            warns.append(msg)
            print(msg, file=sys.stderr)
            if source["id"] in cached_docs:
                prior = cached_docs[source["id"]].copy()
                prior["status"] = "stale_source_fetch_failed"
                prior["last_error"] = str(exc)
                docs.append(prior)
                out += [v for v in cached_snips if v["doc_id"] == source["id"]]
            else:
                docs.append({**source, "status": "unavailable", "last_error": str(exc)})
    status = {"generated_at": stamp, "source_count": len(docs),
              "status": "partial" if warns else "indexed", "warnings": warns}
    (DATA / "index.json").write_text(json.dumps({"generated_at": stamp, "documents": docs,
        "snippets": out, "warnings": warns}, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    (DATA / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf8")
    print(f"Generated {len(out)} document navigation snippets; status={status['status']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    update_data(offline=args.check_only)
