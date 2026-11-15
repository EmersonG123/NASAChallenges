"""Ejecuta todo el pipeline de datos ASTRA de principio a fin."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

PASOS = [
    ("1. OSDR (Biotelemetría OSD-681: ICP y Temperatura)", ["osdr.py"]),
    ("2. DONKI (Eventos solares reales SEP, CME y GST)", ["donki.py", "2026-01-01", "2026-02-28"]),
    ("3. Curiosity RAD (Dosimetría real en Marte desde NASA PDS)", ["curiosity_rad.py", "5"]),
    ("4. NTRS (Referencias y literatura científica NASA)", ["ntrs.py"]),
    ("5. Recursos Visuales y Contexto Orbital UI (EPIC + NASA Image Library)", ["media_context.py"]),
    ("6. Integración, simulación fisiológica y motor de alertas ASTRA", ["simulate_and_merge.py"]),
]


def main():
    print("=" * 65)
    print("🚀 PIPELINE DE DATOS ASTRA - EJECUCIÓN COMPLETA")
    print("=" * 65)
    for titulo, cmd in PASOS:
        print(f"\n>>> {titulo}", flush=True)
        res = subprocess.run([sys.executable, str(ROOT / cmd[0]), *cmd[1:]], cwd=ROOT)
        if res.returncode != 0:
            print(f"[ERROR] Falló el paso: {titulo}")
            sys.exit(res.returncode)

    print("\n" + "=" * 65)
    print("✅ PIPELINE COMPLETADO CON ÉXITO")
    print(f"Archivos listos en: {ROOT / 'data' / 'processed'}")
    print("=" * 65)


if __name__ == "__main__":
    main()

