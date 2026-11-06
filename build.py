"""Build the website from the Obsidian vault.

Writes content.json (all content, rendered in the browser), one page per post at
p/<slug>/index.html (so shared links get a proper title and preview), and sitemap.xml.

Usage: python3 build.py   (no dependencies, runs in the deploy workflow too)
"""
import html
import json
import re
import unicodedata
from pathlib import Path

SITE = "https://vojtechklouda.com"
ROOT = Path(__file__).parent
VAULT = ROOT / "vault"
OUT = ROOT / "content.json"


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


def head_meta(title, description, url, image="", kind="website"):
    """The <head> tags that link previews (LinkedIn etc.) and search engines read."""
    e = html.escape
    tags = [
        f"<title>{e(title)}</title>",
        f'<meta name="description" content="{e(description)}">',
        f'<link rel="canonical" href="{e(url)}">',
        f'<meta property="og:type" content="{kind}">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(description)}">',
        f'<meta property="og:url" content="{e(url)}">',
    ]
    if image:
        tags.append(f'<meta property="og:image" content="{e(image)}">')
    return "\n    ".join(tags)


def image_url(value):
    """`image:` is a file in vault/assets (just the name is enough) or a full URL."""
    if not value or value.startswith("http"):
        return value or ""
    return f"{SITE}/vault/assets/{value.split('/')[-1]}"


def write_post_pages(projects):
    template = (ROOT / "index.html").read_text(encoding="utf-8")
    start, end = "<!-- meta -->", "<!-- /meta -->"
    before, rest = template.split(start)
    after = rest.split(end)[1]
    for p in projects:
        url = f"{SITE}/p/{p['slug']}/"
        meta = head_meta(f"{p['title']} — Vojtěch Klouda", p["summary"] or p["title"], url,
                         image_url(p["image"]), kind="article")
        page = ROOT / "p" / p["slug"] / "index.html"
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(f"{before}{start}\n    {meta}\n    {end}{after}", encoding="utf-8")

    urls = [f"{SITE}/"] + [f"{SITE}/p/{p['slug']}/" for p in projects]
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{html.escape(u)}</loc></url>\n" for u in urls)
        + "</urlset>\n", encoding="utf-8")


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
            "image": meta.get("image") or "",
            "tags": meta.get("tags") or [],
            "body": body.strip(),
        })
    projects.sort(key=lambda p: p["date"], reverse=True)

    _, cv = split_frontmatter((VAULT / "cv.md").read_text(encoding="utf-8"))
    OUT.write_text(json.dumps({"cv": cv.strip(), "projects": projects}, ensure_ascii=False, indent=1),
                   encoding="utf-8")
    write_post_pages(projects)
    print(f"Built content.json and {len(projects)} post pages:")
    for p in projects:
        print(f"  {SITE}/p/{p['slug']}/")


if __name__ == "__main__":
    main()
