"""Descarga y procesa datos reales de radiación de Curiosity RAD desde NASA PDS PPI.

Repositorio oficial:
  https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_04710_04843/

Variables extraídas (verificadas en los archivos .LBL/.TXT):
  - rad_dose_rate_e: Tasa de dosis en detector E (plástico equivalente a tejido), en uGy/h
  - rad_dose_rate_b: Tasa de dosis en detector B (silicio), en uGy/h
  - rad_daily_equiv_e: Dosis diaria equivalente en tejido (mGy/día = uGy/h * 24 / 1000)

Uso:
  python curiosity_rad.py          # descarga muestra de soles recientes (2026)
  python curiosity_rad.py 10       # descarga N archivos recientes
"""
import re
import sys
from datetime import datetime, timedelta

from common import get, guardar_filas, guardar_raw

BASE_DIR_URL = "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_04710_04843/"


def doy_a_iso(texto_utc: str) -> str:
    """Convierte 'YYYY-DOY hh:mm:ss' (formato PDS) a ISO 8601 'YYYY-MM-DDThh:mm:ssZ'."""
    partes = texto_utc.strip().strip('"').split()
    anio, doy = (int(x) for x in partes[0].split("-"))
    hora = partes[1] if len(partes) > 1 else "00:00:00"
    fecha = datetime(anio, 1, 1) + timedelta(days=doy - 1)
    return f"{fecha.strftime('%Y-%m-%d')}T{hora}Z"


def listar_txt_recientes(limite: int = 5) -> list:
    r = get(BASE_DIR_URL)
    nombres = sorted(set(re.findall(r'RAD_RDR_\d{4}_\d{3}_[0-9_]+_V\d+\.TXT', r.text)))
    return nombres[-limite:]


def parsear_rdr(texto: str, url: str) -> list:
    sol_m = re.search(r"START_SOL\s*=\s*(\d+)", texto)
    sol = int(sol_m.group(1)) if sol_m else ""

    bloques = re.split(r"\[OBSERVATION:\s*\d+\]", texto)[1:]
    filas = []
    tasas_e = []

    for b in bloques:
        utc_m = re.search(r'START_OBS_UTC\s*=\s*"([^"]+)"', b)
        if not utc_m:
            continue
        ts = doy_a_iso(utc_m.group(1))

        for det, var in (("B", "rad_dose_rate_b"), ("E", "rad_dose_rate_e")):
            m = re.search(rf"\[DOSIMETRY_TOTAL_DOSE_{det}:\s*\d+\]\s*([0-9.+-]+)", b)
            if m:
                val = float(m.group(1))
                if val >= 0:
                    filas.append({
                        "subject_id": "MSL-Curiosity",
                        "timestamp": ts,
                        "mission_day": sol,
                        "variable": var,
                        "valor": round(val, 4),
                        "unidad": "uGy/h",
                        "fuente": "PDS MSL-RAD-RDR",
                        "source_type": "real",
                        "ref": url,
                    })
                    if det == "E":
                        tasas_e.append((ts[:10], val))

    if tasas_e:
        media_ugy_h = sum(v for _, v in tasas_e) / len(tasas_e)
        dosis_mgy_dia = round(media_ugy_h * 24.0 / 1000.0, 4)
        filas.append({
            "subject_id": "MSL-Curiosity",
            "timestamp": f"{tasas_e[0][0]}T12:00:00Z",
            "mission_day": sol,
            "variable": "rad_daily_dose_mars",
            "valor": dosis_mgy_dia,
            "unidad": "mGy/day",
            "fuente": "PDS MSL-RAD-RDR (Detector E avg)",
            "source_type": "derived",
            "ref": url,
        })

    return filas


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    print(f"Curiosity RAD (PDS PPI) - descargando {n} soles recientes...")
    archivos = listar_txt_recientes(n)

    filas = []
    for nombre in archivos:
        url = BASE_DIR_URL + nombre
        r = get(url)
        if r.status_code != 200:
            print(f"   [ERROR] {nombre}: HTTP {r.status_code}")
            continue
        guardar_raw(nombre, r.text)
        nuevas = parsear_rdr(r.text, url)
        print(f"   {nombre}: {len(nuevas)} registros extraídos")
        filas.extend(nuevas)

    ruta = guardar_filas("curiosity_rad.csv", filas)
    print(f"[OK] {len(filas)} filas -> {ruta}")


if __name__ == "__main__":
    main()

