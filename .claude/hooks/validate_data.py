#!/usr/bin/env python3
"""PostToolUse hook: validate data/*.json after an edit.

Catches the failure modes unique to this data-driven, build-less site:
broken JSON (blank site), duplicate ids, missing required fields,
and recipe->plant links that don't resolve.

Exit 0 = ok (silent). Exit 2 = feed stderr back to Claude as blocking feedback.
"""
import json, os, re, sys

_CITE = re.compile(r"\[(\d+(?:\s*,\s*\d+)*)\]")

def _cite_problems(pid, n_bron, *texts):
    """Footnote markers [n]/[n,m] in prose must reference an existing bron."""
    out = []
    for t in texts:
        if not isinstance(t, str):
            continue
        for m in _CITE.finditer(t):
            for num in m.group(1).split(","):
                num = num.strip()
                if num.isdigit() and not (1 <= int(num) <= n_bron):
                    out.append(f"plant '{pid}': voetnoot [{num}] verwijst naar een niet-bestaande bron "
                               f"(plant heeft {n_bron} bronnen)")
    return out

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0  # not a hook invocation we understand; do nothing

    fp = (payload.get("tool_input", {}) or {}).get("file_path", "") or ""
    fp = fp.replace("\\", "/")
    if not (fp.endswith(".json") and "/data/" in fp):
        return 0  # only guard data/*.json

    data_dir = os.path.dirname(fp)
    problems = []

    def load(path):
        if not os.path.exists(path):
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    # 1) the edited file must be valid JSON
    try:
        load(fp)
    except json.JSONDecodeError as e:
        print(f"[data-guard] {os.path.basename(fp)} is GEEN geldige JSON: {e}. "
              f"De site laadt nu niet. Repareer de JSON.", file=sys.stderr)
        return 2

    plants_path = os.path.join(data_dir, "plants.json")
    recipes_path = os.path.join(data_dir, "recipes.json")

    try:
        plants = load(plants_path) or []
        recipes = load(recipes_path) or []
    except json.JSONDecodeError as e:
        print(f"[data-guard] Kon sibling data niet lezen: {e}", file=sys.stderr)
        return 2

    # 2) plants integrity
    ids = []
    if isinstance(plants, list):
        for p in plants:
            pid = p.get("id")
            ids.append(pid)
            for k in ("id", "naam", "latijn", "status"):
                if not p.get(k):
                    problems.append(f"plant '{pid}': verplicht veld '{k}' ontbreekt of leeg")
            if "giftigeVerwisseling" not in p:
                problems.append(f"plant '{pid}': 'giftigeVerwisseling' ontbreekt")
            # footnote markers must reference an existing bron
            n_bron = len(p.get("bronnen") or [])
            texts = [p.get(k) for k in ("ecosysteem", "gebruik", "info", "oogstmethode",
                                        "wildplukGevolgen", "verwisselingIntro", "waarschuwing")]
            for k in (p.get("seizoenskalender") or []):
                texts.append(k.get("toepassing") if isinstance(k, dict) else None)
            gv = p.get("giftigeVerwisseling")
            if isinstance(gv, list):
                for l in gv:
                    if isinstance(l, dict):
                        texts.append(l.get("onderscheid"))
            elif isinstance(gv, str):
                texts.append(gv)
            problems.extend(_cite_problems(pid, n_bron, *texts))
        dupes = sorted({x for x in ids if ids.count(x) > 1})
        if dupes:
            problems.append(f"dubbele plant-id's: {', '.join(map(str, dupes))}")
    idset = set(ids)

    # 3) recipe -> plant links resolve
    if isinstance(recipes, list):
        for r in recipes:
            for pid in (r.get("planten") or []):
                if pid not in idset:
                    problems.append(f"recept '{r.get('id')}' verwijst naar onbekende plant-id '{pid}'")

    if problems:
        print("[data-guard] Data-integriteit problemen:\n - " + "\n - ".join(problems),
              file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
