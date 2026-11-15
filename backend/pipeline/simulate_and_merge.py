"""Genera las series sintéticas/derivadas calibradas con eventos reales de DONKI,
consolida todas las fuentes en un único dataset unificado y ejecuta el motor de
detección de anomalías (Z-score robusto con Mediana/MAD) para el MVP ASTRA.

Escenario por defecto:
  30 días de misión (2026-01-01 a 2026-01-30), donde ocurrieron eventos SEP y
  tormentas geomagnéticas reales registrados en DONKI (p. ej. 2026-01-18).
"""
import csv
import json
import math
import random
from datetime import date, datetime, timedelta
from statistics import median

from common import PROCESSED_DIR, SCHEMA, guardar_filas


def cargar_csv(nombre: str) -> list:
    ruta = PROCESSED_DIR / nombre
    if not ruta.exists():
        return []
    with ruta.open("r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def mad(valores: list) -> float:
    """Desviación absoluta mediana (robusta frente a valores extremos)."""
    med = median(valores)
    desv = [abs(x - med) for x in valores]
    return median(desv) or 1e-6


def z_robusto(valor: float, base: list) -> float:
    med = median(base)
    escala = 1.4826 * mad(base)
    return (valor - med) / escala


def simular_mision(donki_rows: list, inicio=date(2026, 1, 1), dias=30, seed=42):
    random.seed(seed)

    # Identificar qué días tuvieron eventos SEP o Kp alto reales en DONKI
    dias_sep = set()
    kp_por_dia = {}
    for r in donki_rows:
        ts = (r.get("timestamp") or "")[:10]
        if not ts:
            continue
        if r["variable"] == "sep_event":
            dias_sep.add(ts)
        elif r["variable"] == "kp_index":
            kp_por_dia[ts] = max(kp_por_dia.get(ts, 0.0), float(r["valor"]))

    filas = []
    dosis_acum = 0.0

    for d in range(1, dias + 1):
        fecha = inicio + timedelta(days=d - 1)
        f_str = fecha.isoformat()
        ts_dia = f"{f_str}T08:00:00Z"

        # ¿Hubo SEP ese día o en los 2 días previos? (efecto rezagado post-SEP)
        sep_activo = any(
            (fecha - timedelta(days=k)).isoformat() in dias_sep for k in (0, 1, 2)
        )
        kp = kp_por_dia.get(f_str, 0.0)

        # 1. Dosis diaria de radiación (derived: basal LEO ~0.35 mGy/día + pico por SEP/Kp)
        dosis_dia = 0.35 + random.gauss(0, 0.03)
        if f_str in dias_sep:
            dosis_dia += 1.45  # pico de partículas solares energéticas
        elif sep_activo:
            dosis_dia += 0.55
        if kp >= 5:
            dosis_dia += 0.25
        dosis_dia = max(0.20, round(dosis_dia, 3))
        dosis_acum = round(dosis_acum + dosis_dia, 3)

        # 2. Frecuencia cardíaca media diaria (synthetic, calibrada con literatura NTRS)
        # Basal ~70 bpm + deriva suave de microgravedad + incremento sinérgico si hay SEP/estrés
        fc_base = 70.0 + 3.0 * math.sin(2 * math.pi * d / 7.0) + random.gauss(0, 2.2)
        if sep_activo:
            fc_base += 16.5  # incremento sostenido por estrés/alerta operacional
        fc = round(fc_base, 1)

        # 3. Variabilidad de frecuencia cardíaca HRV RMSSD (ms, synthetic)
        hrv_base = 44.0 + random.gauss(0, 3.0) - (12.0 if sep_activo else 0.0)
        hrv = round(max(18.0, hrv_base), 1)

        # 4. Horas de sueño (synthetic: basal ~7.3 h, cae tras evento SEP)
        sueno_base = 7.3 + random.gauss(0, 0.35) - (1.9 if sep_activo else 0.0)
        sueno = round(max(4.0, min(9.0, sueno_base)), 2)

        # 5. Escala de estrés subjetivo/conductual (1-10, synthetic)
        estres_base = 3.0 + max(0.0, (7.2 - sueno) * 1.8) + (1.5 if sep_activo else 0.0)
        estres = round(min(10.0, max(1.0, estres_base + random.gauss(0, 0.3))), 1)

        indicadores = [
            ("radiation_daily_dose", dosis_dia, "mGy", "DONKI-SEP+LEO-model", "derived"),
            ("radiation_cum_dose", dosis_acum, "mGy", "DONKI-SEP+LEO-model", "derived"),
            ("heart_rate", fc, "bpm", "ASTRA-Sim (calibrado NTRS)", "synthetic"),
            ("hrv_rmssd", hrv, "ms", "ASTRA-Sim (calibrado NTRS)", "synthetic"),
            ("sleep_duration", sueno, "hours", "ASTRA-Sim (HRP baseline)", "synthetic"),
            ("stress_score", estres, "scale_1_10", "ASTRA-Sim", "synthetic"),
        ]
        for var, val, uni, fte, stype in indicadores:
            filas.append({
                "subject_id": "ASTR-1",
                "timestamp": ts_dia,
                "mission_day": d,
                "variable": var,
                "valor": val,
                "unidad": uni,
                "fuente": fte,
                "source_type": stype,
                "ref": "https://ntrs.nasa.gov/citations/20040089526",
            })

    return filas


def evaluar_alertas(filas_astr: list) -> list:
    """Evalúa desviaciones respecto a la línea basal (primeros 10 días) usando Z-score robusto."""
    por_var = {}
    for f in filas_astr:
        por_var.setdefault(f["variable"], []).append((int(f["mission_day"]), float(f["valor"]), f["timestamp"]))

    base = {
        var: [v for dia, v, _ in serie if dia <= 10]
        for var, serie in por_var.items()
    }

    alertas = []
    dias = sorted({int(f["mission_day"]) for f in filas_astr})
    for d in dias:
        vals = {f["variable"]: float(f["valor"]) for f in filas_astr if int(f["mission_day"]) == d}
        ts = next(f["timestamp"] for f in filas_astr if int(f["mission_day"]) == d)

        z_fc = z_robusto(vals["heart_rate"], base["heart_rate"])
        z_sueno = z_robusto(vals["sleep_duration"], base["sleep_duration"])
        dosis = vals["radiation_daily_dose"]

        motivos = []
        if z_fc > 2.5:
            motivos.append(f"FC elevada ({vals['heart_rate']} bpm, z={z_fc:+.1f})")
        if z_sueno < -2.0 or vals["sleep_duration"] < 6.0:
            motivos.append(f"Sueño reducido ({vals['sleep_duration']} h, z={z_sueno:+.1f})")
        if dosis > 0.60:
            motivos.append(f"Pico de radiación diaria ({dosis} mGy)")

        if len(motivos) >= 2:
            nivel = "CRITICA" if len(motivos) == 3 else "ALTA"
            alertas.append({
                "mission_day": d,
                "date": ts[:10],
                "level": nivel,
                "triggers": motivos,
                "explanation": (
                    f"Día {d} ({ts[:10]}): Incremento sinérgico de factores de riesgo -> "
                    + "; ".join(motivos)
                ),
                "recommendation": (
                    "Chequeo médico remoto, reducir carga física en EVA/ejercicio, "
                    "priorizar protocolo de descanso y verificar blindaje ante evento SEP."
                ),
                "ntrs_reference": "https://ntrs.nasa.gov/citations/20040089526",
            })

    return alertas


def main():
    donki = cargar_csv("donki_events.csv")
    osdr = cargar_csv("osdr_OSD-681.csv")
    rad = cargar_csv("curiosity_rad.csv")

    sim = simular_mision(donki)
    unificado = donki + osdr + rad + sim
    ruta_uni = guardar_filas("astra_unified_dataset.csv", unificado)

    alertas = evaluar_alertas(sim)
    ruta_alertas = PROCESSED_DIR / "astra_alerts.json"
    ruta_alertas.write_text(json.dumps(alertas, indent=2, ensure_ascii=False), encoding="utf-8")

    # Resumen por source_type
    conteo = {}
    for f in unificado:
        conteo[f["source_type"]] = conteo.get(f["source_type"], 0) + 1

    print(f"[OK] Dataset unificado: {len(unificado)} filas -> {ruta_uni}")
    print(f"     Desglose por source_type: {conteo}")
    print(f"[OK] Alertas detectadas: {len(alertas)} -> {ruta_alertas}")
    for a in alertas:
        print(f"   - [{a['level']}] {a['explanation']}")


if __name__ == "__main__":
    main()
