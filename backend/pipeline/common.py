"""Utilidades compartidas del pipeline ASTRA: configuración, sesión HTTP y esquema común."""
import csv
import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# La API Key se busca en pipeline/.env o en la raíz del proyecto
for _env in (ROOT / ".env", ROOT.parent / ".env"):
    if _env.exists():
        load_dotenv(_env)
        break
NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")

# Esquema común para TODAS las fuentes
SCHEMA = [
    "subject_id",   # astronauta / animal / "ENV" para el entorno espacial
    "timestamp",    # ISO 8601 UTC si existe (eventos DONKI)
    "mission_day",  # día relativo de misión/experimento si existe (OSDR)
    "variable",     # nombre del indicador
    "valor",        # valor numérico
    "unidad",
    "fuente",       # p. ej. "DONKI-SEP", "OSDR OSD-681"
    "source_type",  # real | synthetic | derived
    "ref",          # enlace a la fuente original (trazabilidad)
]


def clave_oculta(clave: str = NASA_API_KEY) -> str:
    return clave if clave == "DEMO_KEY" or len(clave) <= 8 else f"{clave[:4]}...{clave[-4:]}"


def get(url, params=None, timeout=40, intentos=3):
    """GET con reintentos: los servicios de la NASA a veces tardan o dan 5xx."""
    for i in range(1, intentos + 1):
        try:
            r = requests.get(url, params=params, timeout=timeout,
                             headers={"User-Agent": "ASTRA-SpaceApps/1.0"})
            if r.status_code < 500:
                return r
            print(f"   HTTP {r.status_code}, reintento {i}/{intentos}...")
        except requests.exceptions.RequestException as e:
            print(f"   {type(e).__name__}, reintento {i}/{intentos}...")
        time.sleep(2 * i)
    raise RuntimeError(f"No se pudo obtener {url}")


def guardar_raw(nombre: str, contenido) -> Path:
    """Guarda la respuesta original sin modificar (reproducibilidad)."""
    ruta = RAW_DIR / nombre
    if isinstance(contenido, (bytes, bytearray)):
        ruta.write_bytes(contenido)
    elif isinstance(contenido, str):
        ruta.write_text(contenido, encoding="utf-8")
    else:
        ruta.write_text(json.dumps(contenido, indent=1, ensure_ascii=False), encoding="utf-8")
    return ruta


def guardar_filas(nombre: str, filas: list) -> Path:
    """Guarda filas en el esquema común como CSV en data/processed/."""
    ruta = PROCESSED_DIR / nombre
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SCHEMA)
        w.writeheader()
        for fila in filas:
            w.writerow({k: fila.get(k, "") for k in SCHEMA})
    return ruta

