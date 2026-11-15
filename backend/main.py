"""ASTRA API.

- Behaviour model: YOLO11s driver-drowsiness model
  (github.com/Mohab-Refaai/driver-drowsiness-detection, MIT License) on camera frames.
  Optional: if torch/ultralytics or the weights are missing, the rest of the API still runs.
- Online sync for the offline desktop app (sync.py, SQLite file in data/astra.db).
- NASA data for the physiology & radiation module.

Run:  uvicorn main:app --port 8000   (from this folder)
"""
from __future__ import annotations

import io
import mimetypes
import os
import threading
import time
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from sync import router as sync_router

try:  # the behaviour model is optional (heavy dependencies)
    from ultralytics import YOLO
except ImportError:  # pragma: no cover
    YOLO = None  # type: ignore[assignment,misc]

# Windows often lacks these, and browsers refuse ES modules / wasm served as text/plain.
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("application/wasm", ".wasm")

MODEL_PATH = Path(os.getenv("ASTRA_MODEL", Path(__file__).parent / "models" / "drowsiness_yolo11s.pt"))
CONF_THRESHOLD = float(os.getenv("ASTRA_CONF", "0.50"))  # same threshold as the original app
IMG_SIZE = 640
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# Class metadata: Spanish label, how it feeds ASTRA's indicators.
CLASSES = {
    "SafeDriving":      {"es": "Atento",               "fatigue": 0,  "attention": 0,  "level": "ok"},
    "SleepyDriving":    {"es": "Somnolencia",          "fatigue": 90, "attention": 40, "level": "crit"},
    "Yawn":             {"es": "Bostezo",              "fatigue": 60, "attention": 10, "level": "warn"},
    "Distracted":       {"es": "Distraído",            "fatigue": 10, "attention": 70, "level": "warn"},
    "Drinking":         {"es": "Bebiendo",             "fatigue": 0,  "attention": 30, "level": "watch"},
    "DangerousDriving": {"es": "Conducta peligrosa",   "fatigue": 20, "attention": 90, "level": "crit"},
}

app = FastAPI(title="ASTRA API", version="1.1.0",
              description="Detección de fatiga y distracción con YOLO11s para ASTRA.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])

_model = None
_lock = threading.Lock()


def get_model():
    global _model
    if _model is None:
        if YOLO is None:
            raise HTTPException(503, "Modelo de conducta no instalado en este servidor.")
        if not MODEL_PATH.exists():
            raise HTTPException(503, f"Modelo no encontrado en {MODEL_PATH}")
        _model = YOLO(str(MODEL_PATH))
        _model.predict(np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8), imgsz=IMG_SIZE, verbose=False)  # warm-up
    return _model


@app.on_event("startup")
def _load() -> None:
    try:
        get_model()
    except HTTPException:
        pass  # sync and data endpoints keep working without the model


@app.get("/api/health")
def health() -> dict:
    m = get_model()
    return {"status": "ok", "model": MODEL_PATH.name, "classes": list(m.names.values()),
            "conf_threshold": CONF_THRESHOLD, "source": "github.com/Mohab-Refaai/driver-drowsiness-detection"}


@app.post("/api/vision/frame")
async def analyze_frame(file: UploadFile = File(...)) -> dict:
    """Classify one camera frame (JPEG/PNG). Returns the top detection and all detections."""
    data = await file.read()
    if not data:
        raise HTTPException(400, "La imagen está vacía.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "La imagen supera 5 MB. Envía un fotograma más pequeño.")
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(415, "No es una imagen válida (usa JPEG o PNG).")

    model = get_model()
    t0 = time.perf_counter()
    with _lock:  # one inference at a time on CPU
        res = model.predict(img, imgsz=IMG_SIZE, conf=0.05, verbose=False)[0]
    ms = round((time.perf_counter() - t0) * 1000, 1)

    w, h = img.size
    dets = []
    if res.boxes is not None:
        for b in res.boxes:
            name = model.names[int(b.cls)]
            x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
            dets.append({"class": name, "label": CLASSES.get(name, {}).get("es", name),
                         "confidence": round(float(b.conf), 3),
                         "box": [round(x1 / w, 4), round(y1 / h, 4), round(x2 / w, 4), round(y2 / h, 4)]})
    dets.sort(key=lambda d: d["confidence"], reverse=True)

    top = dets[0] if dets else None
    confident = bool(top and top["confidence"] >= CONF_THRESHOLD)
    meta = CLASSES.get(top["class"], CLASSES["SafeDriving"]) if confident else None
    return {
        "top": top,
        "confident": confident,
        "state": top["class"] if confident else "Uncertain",
        "state_es": meta["es"] if meta else "Sin certeza",
        "level": meta["level"] if meta else "none",
        "fatigue_hint": meta["fatigue"] if meta else None,
        "attention_hint": meta["attention"] if meta else None,
        "detections": dets[:5],
        "inference_ms": ms,
        "image_size": [w, h],
    }


@app.get("/api/monitor")
def monitor() -> dict:
    """Real NASA data for the physiology & radiation module (output of backend/pipeline).

    Refresh the data with:  cd backend/pipeline && python run_all.py
    """
    import sys
    sys.path.insert(0, str(Path(__file__).parent / "pipeline"))
    from export_frontend import build  # noqa: E402
    return build()


app.include_router(sync_router)

# desktop installers published by desktop/scripts/publish.cjs (also served by the website)
DOWNLOADS = Path(__file__).resolve().parent.parent / "frontend" / "public" / "downloads"
if DOWNLOADS.exists():
    app.mount("/downloads", StaticFiles(directory=DOWNLOADS), name="downloads")
