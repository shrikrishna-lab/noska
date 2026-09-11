#!/usr/bin/env python3
"""Delete noska Vercel deployments older than 7 days, keeping the 5 newest.
Other projects (admin, portfolio, frontend) are not touched."""
import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

PROJECT = "noska"
KEEP_NEWEST = 5
CUTOFF_DAYS = 7

failed_urls = set()
deleted = 0
cutoff = datetime.now(timezone.utc) - timedelta(days=CUTOFF_DAYS)


def list_deployments():
    r = subprocess.run(
        ["npx", "vercel", "ls", PROJECT, "--format", "json", "--limit", "100"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True,
        timeout=120,
    )
    out = r.stdout.strip()
    # CLI may print banner lines before the JSON; find the first '[' or '{'
    for i, ch in enumerate(out):
        if ch in "[{":
            out = out[i:]
            break
    d = json.loads(out)
    return d if isinstance(d, list) else d.get("deployments", [])


def remove(url):
    r = subprocess.run(
        ["npx", "vercel", "rm", url, "--yes"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True,
        timeout=120,
    )
    ok = r.returncode == 0
    if not ok:
        err = (r.stderr or r.stdout or "").strip().splitlines()
        print(f"  FAILED {url}: {err[-1][:160] if err else 'unknown'}", flush=True)
    return ok


while True:
    deps = list_deployments()
    if not deps:
        print("No deployments returned — done.", flush=True)
        break
    deps.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
    protected = {d.get("url") or d.get("uid") for d in deps[:KEEP_NEWEST]}

    targets = []
    for d in deps[KEEP_NEWEST:]:
        created = datetime.fromtimestamp(d.get("createdAt", 0) / 1000, timezone.utc)
        url = d.get("url") or d.get("uid")
        if created < cutoff and url and url not in protected and url not in failed_urls:
            targets.append((url, created, d.get("state")))

    if not targets:
        print(f"No more deletable deployments in this batch ({len(deps)} listed, "
              f"{len(failed_urls)} permanently failed). Done.", flush=True)
        break

    print(f"Batch: {len(targets)} deployments older than {CUTOFF_DAYS}d to delete "
          f"(oldest {deps[-1]['createdAt'] and datetime.fromtimestamp(deps[-1]['createdAt']/1000, timezone.utc):%Y-%m-%d})", flush=True)
    for url, created, state in targets:
        if remove(url):
            deleted += 1
            print(f"  deleted {url} ({created:%Y-%m-%d}, {state}) [total {deleted}]", flush=True)
        else:
            failed_urls.add(url)
    time.sleep(2)

print(f"DONE — deleted {deleted} noska deployments, {len(failed_urls)} failed/skipped.", flush=True)
