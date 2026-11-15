# ASTRA Vision API (FastAPI + YOLO11s)

Servidor que detecta **somnolencia, bostezos y distracción** en fotogramas de cámara y alimenta el módulo *ASTRA Vision* del tablero.

## Modelo

- **YOLO11s** de [Mohab-Refaai/driver-drowsiness-detection](https://github.com/Mohab-Refaai/driver-drowsiness-detection) (licencia MIT).
- Entrenado con 14.855 imágenes. mAP50 98,9 % y F1 97,7 % en su conjunto de prueba, según el autor.
- 6 clases: `SafeDriving`, `SleepyDriving`, `Yawn`, `Distracted`, `Drinking`, `DangerousDriving`.
- Archivo: `models/drowsiness_yolo11s.pt` (copia de `best.pt`).

## Arrancar

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8000
```

O doble clic en `iniciar_astra.bat`. Abre **http://localhost:8000**: el tablero completo, con cámara en vivo.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/` | Sirve `ASTRA.html` |
| GET | `/api/health` | Estado del modelo y clases |
| POST | `/api/vision/frame` | `multipart/form-data` con `file` (JPEG/PNG, máx. 5 MB). Devuelve el estado, la confianza, la caja y las pistas de fatiga y atención |
| GET | `/docs` | Documentación interactiva (Swagger) |

Respuesta de ejemplo:

```json
{"state":"SleepyDriving","state_es":"Somnolencia","confident":true,"level":"crit",
 "top":{"class":"SleepyDriving","confidence":0.91,"box":[0.31,0.12,0.72,0.88]},
 "fatigue_hint":90,"attention_hint":40,"inference_ms":230.4}
```

## Cómo lo usa el tablero

1. Cada ~350 ms envía un fotograma de 640 px.
2. Guarda las clases del último minuto.
3. **Fatiga** = máx(fatiga facial, ½ fatiga facial + ½ (% somnolencia + 0,6 × % bostezos)).
4. **Distracción** = % de fotogramas distraído o peligroso (+ 0,4 × bebiendo).
5. Si el servidor no responde, el tablero sigue funcionando solo con MediaPipe.

Variables opcionales: `ASTRA_MODEL` (ruta del modelo) y `ASTRA_CONF` (umbral, 0,50 por defecto).

En CPU tarda unos 230–310 ms por fotograma.
