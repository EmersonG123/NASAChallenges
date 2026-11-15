"""Extrae recursos visuales y de contexto orbital de la NASA para el Frontend / UI:
  1. EPIC API (api.nasa.gov/EPIC): Fotos reales de la Tierra desde el espacio +
     coordenadas orbitales J2000 (satélite DSCOVR, Luna y Sol) y lat/lon del centro.
  2. NASA Image & Video Library (images-api.nasa.gov): Imágenes oficiales en alta
     resolución por categoría temática (tormentas solares, ISS, salud de astronautas,
     radiación / Curiosity RAD) listas para usar en tarjetas, banners y alertas del UI.

Diseño agnóstico: No depende de ningún dataset de simulación ni cruce específico.
Genera JSON limpios en data/processed/ listos para cualquier Frontend.
"""
import json
import sys

from common import NASA_API_KEY, PROCESSED_DIR, clave_oculta, get, guardar_raw

TEMAS_UI = {
    "solar_storm_sdo": "solar flare SDO extreme ultraviolet",
    "iss_astronaut_health": "International Space Station astronaut medical",
    "space_radiation": "space radiation shielding astronaut",
    "curiosity_mars_rad": "Curiosity rover Mars surface",
}


def obtener_epic(limite: int = 6) -> list:
    url = "https://api.nasa.gov/EPIC/api/natural"
    r = get(url, params={"api_key": NASA_API_KEY})
    if r.status_code != 200:
        print(f"   [EPIC] Error HTTP {r.status_code}")
        return []

    datos = r.json() or []
    guardar_raw("epic_natural_latest.json", datos)

    salida = []
    for item in datos[:limite]:
        fecha_parte, hora_parte = item["date"].split(" ")
        y, m, d = fecha_parte.split("-")
        img_name = item["image"]
        salida.append({
            "identifier": item.get("identifier"),
            "timestamp_utc": f"{fecha_parte}T{hora_parte}Z",
            "caption": item.get("caption"),
            "centroid_lat": item.get("centroid_coordinates", {}).get("lat"),
            "centroid_lon": item.get("centroid_coordinates", {}).get("lon"),
            "dscovr_j2000_km": item.get("dscovr_j2000_position"),
            "lunar_j2000_km": item.get("lunar_j2000_position"),
            "sun_j2000_km": item.get("sun_j2000_position"),
            "image_png_url": f"https://epic.gsfc.nasa.gov/archive/natural/{y}/{m}/{d}/png/{img_name}.png",
            "image_jpg_thumb": f"https://epic.gsfc.nasa.gov/archive/natural/{y}/{m}/{d}/thumbs/{img_name}.jpg",
        })
    print(f"   EPIC: {len(salida)} imágenes y vectores orbitales extraídos")
    return salida


def obtener_galeria_ui(por_tema: int = 4) -> dict:
    url = "https://images-api.nasa.gov/search"
    catalogo = {}

    for clave_tema, query in TEMAS_UI.items():
        r = get(url, params={"q": query, "media_type": "image"})
        if r.status_code != 200:
            continue
        items = r.json().get("collection", {}).get("items", [])
        vistos = set()
        lista = []
        for it in items:
            info = (it.get("data") or [{}])[0]
            links = (it.get("links") or [{}])[0]
            titulo = info.get("title")
            img_url = links.get("href")
            if not titulo or not img_url or titulo in vistos:
                continue
            vistos.add(titulo)
            lista.append({
                "nasa_id": info.get("nasa_id"),
                "title": titulo,
                "date_created": (info.get("date_created") or "")[:10],
                "center": info.get("center"),
                "description": (info.get("description") or "")[:300],
                "image_url": img_url,
            })
            if len(lista) >= por_tema:
                break
        catalogo[clave_tema] = lista
        print(f"   Galería UI [{clave_tema}]: {len(lista)} imágenes")

    guardar_raw("nasa_images_ui_catalog.json", catalogo)
    return catalogo


def main():
    print(f"Extrayendo recursos visuales y contexto orbital (API Key {clave_oculta()})...")
    epic_data = obtener_epic()
    ui_assets = obtener_galeria_ui()

    ruta_epic = PROCESSED_DIR / "epic_orbital_context.json"
    ruta_epic.write_text(json.dumps(epic_data, indent=2, ensure_ascii=False), encoding="utf-8")

    ruta_ui = PROCESSED_DIR / "nasa_ui_visual_assets.json"
    ruta_ui.write_text(json.dumps(ui_assets, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[OK] Contexto orbital EPIC -> {ruta_epic}")
    print(f"[OK] Catálogo visual UI    -> {ruta_ui}")


if __name__ == "__main__":
    main()

