"""Bundle the Obsidian vault into content.json for the website.

Usage: python3 build.py   (no dependencies, runs in the deploy workflow too)
"""
import json
import re
import unicodedata
from pathlib import Path

VAULT = Path(__file__).parent / "vault"
OUT = Path(__file__).parent / "content.json"


def parse_value(raw):
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        return [parse_value(v) for v in raw[1:-1].split(",") if v.strip()]
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        return raw[1:-1]
    if raw.lower() in ("true", "false"):
        return raw.lower() == "true"
    return raw


def split_frontmatter(text):
    """Parse the simple YAML that Obsidian's properties editor writes."""
    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", text, re.S)
    if not match:
        return {}, text
    meta, key = {}, None
    for line in match.group(1).splitlines():
        item = re.match(r"^\s+-\s*(.*)$", line)
        if item and key:  # "  - value" list items
            if not isinstance(meta[key], list):
                meta[key] = []
            meta[key].append(parse_value(item.group(1)))
        elif ":" in line:
            key, raw = line.split(":", 1)
            key = key.strip()
            meta[key] = parse_value(raw)
    return meta, text[match.end():]


def slugify(name):
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"['’]", "", ascii_name.lower())).strip("-")


def main():
    projects = []
    for path in sorted((VAULT / "projects").glob("*.md")):
        meta, body = split_frontmatter(path.read_text(encoding="utf-8"))
        if meta.get("draft") is True:
            continue
        projects.append({
            "slug": slugify(path.stem),
            "file": path.name,
            "title": meta.get("title") or path.stem,
            "type": meta.get("type") or "project",
            "date": str(meta.get("date") or ""),
            "summary": meta.get("summary") or "",
            "link": meta.get("link") or "",
            "tags": meta.get("tags") or [],
            "body": body.strip(),
        })
    projects.sort(key=lambda p: p["date"], reverse=True)

    _, cv = split_frontmatter((VAULT / "cv.md").read_text(encoding="utf-8"))
    OUT.write_text(json.dumps({"cv": cv.strip(), "projects": projects}, ensure_ascii=False, indent=1),
                   encoding="utf-8")
    print(f"content.json: cv + {len(projects)} projects")


if __name__ == "__main__":
    main()
