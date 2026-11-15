"""Descarga eventos de clima espacial de DONKI (vía api.nasa.gov) y los normaliza.

Tipos usados (verificados el 2026-11-14):
  SEP - Solar Energetic Particles  -> principal proxy de picos de radiación
  CME - Coronal Mass Ejections     -> velocidad (km/s)
  GST - Geomagnetic Storms         -> índice Kp
  (FLR devolvía 404 en api.nasa.gov ese día, por eso no se usa)

Uso:
  python donki.py                          # últimos 365 días
  python donki.py 2026-01-01 2026-02-28    # rango concreto
"""
import sys
from datetime import date, datetime, timedelta

from common import NASA_API_KEY, clave_oculta, get, guardar_filas, guardar_raw

BASE = "https://api.nasa.gov/DONKI"
VENTANA_DIAS = 30  # se pide por tramos para no exceder los límites del servicio


def tramos(inicio: date, fin: date):
    actual = inicio
    while actual <= fin:
        hasta = min(actual + timedelta(days=VENTANA_DIAS - 1), fin)
        yield actual, hasta
        actual = hasta + timedelta(days=1)


def descargar(tipo: str, inicio: date, fin: date) -> list:
    eventos = []
    for a, b in tramos(inicio, fin):
        r = get(f"{BASE}/{tipo}", params={"startDate": a.isoformat(), "endDate": b.isoformat(),
                                         "api_key": NASA_API_KEY})
        if r.status_code != 200:
            print(f"   [{tipo}] {a}..{b}: HTTP {r.status_code}, se omite")
            continue
        datos = r.json() if r.text.strip() else []
        eventos.extend(datos or [])
    print(f"   {tipo}: {len(eventos)} eventos")
    return eventos


def normalizar_sep(eventos):
    return [{
        "subject_id": "ENV", "timestamp": e["eventTime"], "variable": "sep_event",
        "valor": 1, "unidad": "flag", "fuente": "DONKI-SEP", "source_type": "real",
        "ref": e.get("link", ""),
    } for e in eventos]


def normalizar_cme(eventos):
    filas = []
    for e in eventos:
        analisis = e.get("cmeAnalyses") or []
        mejor = next((x for x in analisis if x.get("isMostAccurate")), analisis[0] if analisis else None)
        if not mejor or mejor.get("speed") is None:
            continue
        filas.append({
            "subject_id": "ENV", "timestamp": e["startTime"], "variable": "cme_speed",
            "valor": mejor["speed"], "unidad": "km/s", "fuente": "DONKI-CME",
            "source_type": "real", "ref": e.get("link", ""),
        })
    return filas


def normalizar_gst(eventos):
    return [{
        "subject_id": "ENV", "timestamp": kp["observedTime"], "variable": "kp_index",
        "valor": kp["kpIndex"], "unidad": "Kp", "fuente": f"DONKI-GST ({kp.get('source', '')})",
        "source_type": "real", "ref": e.get("link", ""),
    } for e in eventos for kp in (e.get("allKpIndex") or [])]


def main():
    if len(sys.argv) == 3:
        inicio, fin = (datetime.strptime(x, "%Y-%m-%d").date() for x in sys.argv[1:3])
    else:
        fin = date.today()
        inicio = fin - timedelta(days=365)

    print(f"DONKI {inicio} -> {fin}  (API Key {clave_oculta()})")
    filas = []
    for tipo, normalizar in (("SEP", normalizar_sep), ("CME", normalizar_cme), ("GST", normalizar_gst)):
        eventos = descargar(tipo, inicio, fin)
        guardar_raw(f"donki_{tipo}_{inicio}_{fin}.json", eventos)
        filas.extend(normalizar(eventos))

    filas.sort(key=lambda f: f["timestamp"])
    ruta = guardar_filas("donki_events.csv", filas)
    print(f"[OK] {len(filas)} filas -> {ruta}")


if __name__ == "__main__":
    main()

