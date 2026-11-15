# 🛰️ ASTRA Health · NASA Space Apps Challenge 2026

Gemelo digital de cuerpo completo para astronautas: datos reales de NASA OSDR (Inspiration4), clima espacial DONKI, radiación Curiosity RAD, ASTRA Vision (fatiga y estrés con la cámara), bienestar y sueño, y app de escritorio que funciona sin conexión.

- Documento del proyecto: [`docs/PROYECTO.md`](docs/PROYECTO.md)
- Frontend (Next.js): [`frontend/`](frontend/) · Backend (FastAPI + YOLO11s): [`backend/`](backend/) · Escritorio (Electron): [`desktop/`](desktop/)

```bash
iniciar_todo.bat            # Windows: API en :8000 y web en :3000
```

Los datos crudos de Curiosity RAD se descargan con `cd backend/pipeline && python run_all.py` (necesita `NASA_API_KEY` en `backend/pipeline/.env`).
