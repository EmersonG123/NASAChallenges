"""Busca evidencia científica en NASA NTRS (no requiere API Key).

Sirve para respaldar umbrales de alerta con referencias NASA.
Uso:
  python ntrs.py                          # búsquedas por defecto
  python ntrs.py "sleep spaceflight"      # búsqueda propia
"""
import csv
import sys

from common import PROCESSED_DIR, get, guardar_raw

API = "https://ntrs.nasa.gov/api/citations/search"

BUSQUEDAS = [
    "ambulatory heart rate spaceflight",
    "heart rate variability long duration spaceflight",
    "sleep circadian International Space Station crew",
    "solar particle event astronaut radiation dose",
    "head-down tilt intracranial pressure",
]

CAMPOS = ["consulta", "ntrs_id", "titulo", "anio", "autores", "tipo", "pdf_disponible", "url", "resumen"]


def buscar(consulta: str, n: int = 10) -> list:
    r = get(API, params={"q": consulta, "page.size": n})
    if r.status_code != 200:
        print(f"   [ERROR] '{consulta}': HTTP {r.status_code}")
        return []
    datos = r.json()
    guardar_raw(f"ntrs_{consulta.replace(' ', '_')[:50]}.json", datos)

    out = []
    for c in datos.get("results", []):
        pubs = c.get("publications") or [{}]
        fecha = pubs[0].get("publicationDate") or c.get("created", "")
        out.append({
            "consulta": consulta,
            "ntrs_id": c["id"],
            "titulo": c.get("title", "").strip(),
            "anio": fecha[:4],
            "autores": "; ".join(a["meta"]["author"]["name"] for a in c.get("authorAffiliations", [])[:5]),
            "tipo": c.get("stiType", ""),
            "pdf_disponible": c.get("downloadsAvailable", False),
            "url": f"https://ntrs.nasa.gov/citations/{c['id']}",
            "resumen": (c.get("abstract") or "").replace("\n", " ")[:600],
        })
    print(f"   '{consulta}': {len(out)} resultados (total en NTRS: {datos.get('stats', {}).get('total')})")
    return out


def main():
    consultas = sys.argv[1:] or BUSQUEDAS
    print("NTRS - búsqueda de referencias")
    filas = [f for q in consultas for f in buscar(q)]

    ruta = PROCESSED_DIR / "ntrs_referencias.csv"
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS)
        w.writeheader()
        w.writerows(filas)
    print(f"[OK] {len(filas)} referencias -> {ruta}")


if __name__ == "__main__":
    main()

