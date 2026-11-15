"""Descarga datos fisiológicos reales de NASA OSDR (no requiere API Key).

Estudio por defecto: OSD-681 (LSDS-83)
  "Head-Down Tilt As a Model for Intracranial and Intraocular Pressures, and Retinal
   Changes during Spaceflight" - biotelemetría de presión intracraneal y temperatura.

IMPORTANTE (verificado 2026-11-14): NO es telemetría continua. Son promedios por
animal en días 0, 30, 60 ... 180 (y temperatura basal), con huecos. Sirve para
tendencias de largo plazo, no para alertas horarias.

Uso:
  python osdr.py                # descarga OSD-681
  python osdr.py --listar 681   # solo lista los archivos de un estudio
"""
import csv
import io
import re
import sys
from urllib.parse import quote

from common import get, guardar_filas, guardar_raw

API_FILES = "https://osdr.nasa.gov/osdr/data/osd/files/{osd}"
DOWNLOAD = "https://osdr.nasa.gov/geode-py/ws/studies/OSD-{osd}/download?source=datamanager&file={file}"

# Archivos "TRANSFORMED" de OSD-681: variable y unidad de cada uno
ARCHIVOS_681 = {
    "LSDS-83_Telemetry - Intracranial Pressure_Fuller_BiotelemetryICP_TRANSFORMED.csv":
        ("intracranial_pressure", "torr"),
    "LSDS-83_Telemetry_Fuller_BiotelemetryTb_TRANSFORMED.csv":
        ("body_temperature", "degC"),
}


def listar(osd: str):
    r = get(API_FILES.format(osd=osd))
    archivos = r.json()["studies"][f"OSD-{osd}"]["study_files"]
    for a in archivos:
        print(f"  {a['file_name']}  ({a.get('file_size', 0) / 1e6:.2f} MB)  [{a.get('category')}]")
    return archivos


def ancho_a_largo(texto: str, osd: str, variable: str, unidad: str, url: str) -> list:
    """Convierte columnas Day_N_... / Baseline_... a filas del esquema común."""
    filas = []
    for reg in csv.DictReader(io.StringIO(texto)):
        sujeto = reg.pop("Sample Name")
        for col, val in reg.items():
            if not val or not val.strip():
                continue  # hueco real en el dataset: no se inventa
            m = re.match(r"Day_(\d+)_", col)
            dia = int(m.group(1)) if m else (-1 if col.startswith("Baseline") else None)
            if dia is None:
                continue
            filas.append({
                "subject_id": sujeto, "mission_day": dia, "variable": variable,
                "valor": float(val), "unidad": unidad, "fuente": f"OSDR OSD-{osd}",
                "source_type": "real", "ref": url,
            })
    return filas


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--listar":
        listar(sys.argv[2])
        return

    osd = "681"
    print(f"OSDR OSD-{osd}: archivos disponibles")
    listar(osd)

    filas = []
    for nombre, (variable, unidad) in ARCHIVOS_681.items():
        url = DOWNLOAD.format(osd=osd, file=quote(nombre))
        r = get(url)
        if r.status_code != 200:
            print(f"   [ERROR] {nombre}: HTTP {r.status_code}")
            continue
        guardar_raw(f"OSD-{osd}_{variable}.csv", r.content)
        nuevas = ancho_a_largo(r.content.decode("utf-8-sig"), osd, variable, unidad, url)
        sujetos = len({f["subject_id"] for f in nuevas})
        print(f"   {variable}: {len(nuevas)} mediciones de {sujetos} animales")
        filas.extend(nuevas)

    ruta = guardar_filas(f"osdr_OSD-{osd}.csv", filas)
    print(f"[OK] {len(filas)} filas -> {ruta}")


if __name__ == "__main__":
    main()

