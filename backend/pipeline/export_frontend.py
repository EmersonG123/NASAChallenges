"""Compacta la salida del pipeline (data/processed) en un JSON para el frontend Next.js.

Uso:
  python export_frontend.py                       # escribe ../../landing/src/data/monitor.json
  python export_frontend.py ruta/de/salida.json
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent
PROC = ROOT / "data" / "processed"
DEFAULT_OUT = ROOT.parent.parent / "landing" / "src" / "data" / "monitor.json"


def rows(name):
    p = PROC / name
    if not p.exists():
        return []
    with p.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def build():
    donki = rows("donki_events.csv")
    sep = [{"t": r["timestamp"], "ref": r["ref"]} for r in donki if r["variable"] == "sep_event"]
    cme = [{"t": r["timestamp"], "v": num(r["valor"])} for r in donki if r["variable"] == "cme_speed"]
    kp = [{"t": r["timestamp"], "v": num(r["valor"])} for r in donki if r["variable"] == "kp_index"]

    rad_rows = rows("curiosity_rad.csv")
    by_t = defaultdict(dict)
    for r in rad_rows:
        if r["variable"] in ("rad_dose_rate_e", "rad_dose_rate_b"):
            by_t[r["timestamp"]][r["variable"][-1]] = num(r["valor"])
            by_t[r["timestamp"]]["sol"] = r["mission_day"]
    rad = [{"t": t, "e": v.get("e"), "b": v.get("b"), "sol": int(v["sol"]) if v.get("sol") else None}
           for t, v in sorted(by_t.items()) if v.get("e") is not None]
    rad_daily = [{"t": r["timestamp"], "sol": int(r["mission_day"]), "v": num(r["valor"]), "ref": r["ref"]}
                 for r in rad_rows if r["variable"] == "rad_daily_dose_mars"]

    osdr = defaultdict(lambda: defaultdict(list))
    for r in rows("osdr_OSD-681.csv"):
        osdr[r["variable"]][int(r["mission_day"])].append(num(r["valor"]))
    osdr_out = {}
    for var, days in osdr.items():
        osdr_out[var] = [{"day": d, "mean": round(mean(v), 3), "min": min(v), "max": max(v), "n": len(v)}
                         for d, v in sorted(days.items())]

    unified = rows("astra_unified_dataset.csv")
    sim = defaultdict(dict)
    for r in unified:
        if r["subject_id"] == "ASTR-1":
            d = int(r["mission_day"])
            sim[d]["day"] = d
            sim[d]["date"] = r["timestamp"][:10]
            sim[d][r["variable"]] = num(r["valor"])
    mission = [sim[d] for d in sorted(sim)]

    alerts = json.loads((PROC / "astra_alerts.json").read_text(encoding="utf-8")) if (PROC / "astra_alerts.json").exists() else []
    ntrs = rows("ntrs_referencias.csv")
    seen, refs = set(), []
    for r in ntrs:
        if r["ntrs_id"] in seen:
            continue
        seen.add(r["ntrs_id"])
        refs.append({"id": r["ntrs_id"], "title": r["titulo"], "year": r["anio"], "authors": r["autores"],
                     "topic": r["consulta"], "url": r["url"]})
    epic_p = PROC / "epic_orbital_context.json"
    epic = json.loads(epic_p.read_text(encoding="utf-8")) if epic_p.exists() else []
    gal_p = PROC / "nasa_ui_visual_assets.json"
    gallery = json.loads(gal_p.read_text(encoding="utf-8")) if gal_p.exists() else {}

    return {
        "generated_from": "backend/pipeline (NASA DONKI, OSDR OSD-681, PDS Curiosity RAD, NTRS, EPIC, Image Library)",
        "donki": {"range": ["2026-01-01", "2026-02-28"], "sep": sep, "cme": cme, "kp": kp},
        "rad": {"series": rad, "daily": rad_daily},
        "osdr681": osdr_out,
        "mission": {"start": mission[0]["date"] if mission else None, "days": mission},
        "alerts": alerts,
        "ntrs": refs,
        "epic": epic[:3],
        "gallery": gallery,
    }


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    data = build()
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[OK] {out} ({out.stat().st_size / 1024:.0f} KB) · SEP {len(data['donki']['sep'])} · CME {len(data['donki']['cme'])} · "
          f"Kp {len(data['donki']['kp'])} · RAD {len(data['rad']['series'])} · days {len(data['mission']['days'])} · alerts {len(data['alerts'])}")
