#!/usr/bin/env python3
"""Lädt die Studium-Kurs-JSONs + ein Versions-Manifest in den öffentlichen
Supabase-Bucket `study` (OTA-Content-Updates, s. features/study/courseSync.ts).

Die App liest nur öffentlich per fetch:
  <SUPABASE_URL>/storage/v1/object/public/study/manifest.json
  <SUPABASE_URL>/storage/v1/object/public/study/<id>.json

Manifest-Versionen == COURSE_BUNDLED_VERSION -> Clients laden NICHT (Bundle ist
gleich aktuell). Zum Ausrollen einer Kursänderung: JSON hier neu hochladen UND
seine Version im Manifest hochzählen (und im Client COURSE_BUNDLED_VERSION beim
nächsten App-Release nachziehen). Werte NIE ausgeben.
"""
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent            # apps/mobile/scripts
DATA = HERE.parent / "src" / "features" / "study" / "data"
REPO = HERE.parents[2]                             # SalatiTech (Repo-Root)
BUCKET = "study"

# Muss zu COURSE_DEFS in src/features/study/courses.ts passen.
COURSE_IDS = [
    "tajwid", "grammar", "madinah", "amau", "aqida", "nawawi40",
    "seerah", "prophets", "sahaba", "akhlaq", "nikah", "dialects",
]
BUNDLED_VERSION = 1  # == COURSE_BUNDLED_VERSION im Client (Erstausrollung)


def load_env() -> dict:
    envfile = REPO / ".env"
    if not envfile.exists():
        sys.exit("FEHLER: .env fehlt im Repo-Root.")
    env = {}
    for line in envfile.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    for req in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if not env.get(req):
            sys.exit(f"FEHLER: {req} fehlt in .env.")
    return env


def req(method: str, url: str, body: bytes | None, headers: dict) -> tuple[int, bytes]:
    r = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main() -> None:
    env = load_env()
    base = env["SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    auth = {"Authorization": f"Bearer {key}", "apikey": key}

    # Bucket sicherstellen (public).
    status, _ = req("GET", f"{base}/storage/v1/bucket/{BUCKET}", None, auth)
    if status == 200:
        print(f"Bucket '{BUCKET}' vorhanden.")
    else:
        body = json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode()
        st, resp = req("POST", f"{base}/storage/v1/bucket", body,
                       {**auth, "Content-Type": "application/json"})
        if st not in (200, 201):
            sys.exit(f"FEHLER Bucket anlegen: {st} {resp[:200]!r}")
        print(f"Bucket '{BUCKET}' angelegt (public).")

    def upload(path_in_bucket: str, content: bytes) -> None:
        url = f"{base}/storage/v1/object/{BUCKET}/{path_in_bucket}"
        st, resp = req("POST", url, content,
                       {**auth, "Content-Type": "application/json", "x-upsert": "true"})
        if st not in (200, 201):
            sys.exit(f"FEHLER Upload {path_in_bucket}: {st} {resp[:200]!r}")
        print(f"  hochgeladen: {path_in_bucket}")

    versions = {}
    for cid in COURSE_IDS:
        f = DATA / f"{cid}.json"
        if not f.exists():
            print(f"  (WARN {cid}.json fehlt — übersprungen)")
            continue
        # Neu-serialisieren (kompakt) — validiert zugleich, dass es gültiges JSON ist.
        data = json.loads(f.read_text(encoding="utf-8"))
        upload(f"{cid}.json", json.dumps(data, ensure_ascii=False).encode("utf-8"))
        versions[cid] = BUNDLED_VERSION

    manifest = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "versions": versions,
    }
    upload("manifest.json", json.dumps(manifest, ensure_ascii=False).encode("utf-8"))
    print(f"\nManifest hochgeladen ({len(versions)} Kurse, alle v{BUNDLED_VERSION}).")
    print(f"Public: {base}/storage/v1/object/public/{BUCKET}/manifest.json")


if __name__ == "__main__":
    main()
