#!/usr/bin/env python3
"""Apply a .sql migration file to a Supabase project via the management API,
splitting on semicolons while respecting dollar-quoted blocks and strings."""
import json
import sys
import urllib.request

TOKEN = sys.argv[1]
REF = sys.argv[2]
PATH = sys.argv[3]


def split_statements(sql: str):
    stmts, buf, i, n = [], [], 0, len(sql)
    while i < n:
        ch = sql[i]
        # dollar-quote block ($$, $body$, ...)
        if ch == "$":
            j = i + 1
            while j < n and (sql[j].isalnum() or sql[j] == "_"):
                j += 1
            if j < n and sql[j] == "$":  # $tag$ (tag may be empty -> $$)
                tag = sql[i : j + 1]
                end = sql.find(tag, j + 1)
                if end == -1:
                    buf.append(sql[i:])
                    i = n
                    break
                buf.append(sql[i : end + len(tag)])
                i = end + len(tag)
                continue
        # line comment before quote handling — comments may contain apostrophes
        if ch == "-" and i + 1 < n and sql[i + 1] == "-":
            j = sql.find("\n", i)
            j = n if j == -1 else j
            buf.append(sql[i:j])
            i = j
            continue
        if ch == "'":  # single-quoted string ('' escape)
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            buf.append(sql[i : j + 1])
            i = j + 1
            continue
        if ch == '"':  # quoted identifier
            j = sql.find('"', i + 1)
            j = n - 1 if j == -1 else j
            buf.append(sql[i : j + 1])
            i = j + 1
            continue
        if ch == ";":
            stmts.append("".join(buf).strip())
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        stmts.append(tail)
    return [s for s in stmts if s and not all(
        line.strip().startswith("--") or not line.strip() for line in s.splitlines()
    )]


def minify(stmt: str) -> str:
    """The management API truncates queries at ';'-plus-newline boundaries, so
    strip comment lines and collapse all newlines before sending."""
    lines = [l for l in stmt.splitlines() if not l.strip().startswith("--")]
    return " ".join(" ".join(lines).split())


def run(stmt: str):
    stmt = minify(stmt)
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": stmt}).encode(),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


sql = open(PATH, encoding="utf-8").read()
ok = 0
for idx, stmt in enumerate(split_statements(sql), 1):
    try:
        out = run(stmt)
        # endpoint returns a list on success, dict with "message" on error
        if isinstance(out, dict) and "message" in out:
            print(f"[{idx}] ERROR: {out['message'][:300]}")
            print("---- statement head ----")
            print(stmt[:400])
            sys.exit(1)
        ok += 1
        first_line = stmt.splitlines()[0][:80].encode('ascii', 'replace').decode('ascii')
        print(f"[{idx}] OK ({first_line})")
    except urllib.error.HTTPError as e:
        print(f"[{idx}] HTTP {e.code}: {e.read().decode()[:300]}")
        print("---- statement head ----")
        print(stmt[:400])
        sys.exit(1)
print(f"Applied {ok} statements from {PATH}")
