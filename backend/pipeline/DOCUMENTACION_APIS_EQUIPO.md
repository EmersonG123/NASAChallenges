# Catálogo Técnico de APIs NASA y Guía Agnóstica de Cruce Fisiológico (ASTRA)

Este documento reúne en un solo lugar:
1. **La documentación técnica completa de todas las APIs y fuentes de la NASA validadas** (URLs exactas, parámetros, autenticación, límites de cuota y **ejemplos reales de los JSON/archivos que devuelve cada una**).
2. **La guía agnóstica de cruce fisiológico y ambiental** (según [`deep-research-report.md`](../deep-research-report.md)), detallando con qué variables fisiológicas, conductuales, de radiación o de interfaz visual se cruza cada API, sin atarla a una simulación fija.

---

## Parte I — Mapa General y Estado Real de Endpoints (Verificados en Vivo)

| Categoría | Servicio / API | ¿Usa `NASA_API_KEY`? | Endpoint Base Verificado | Formato Nativo | Estado Real | Propósito Independiente |
|---|---|---|---|---|---|---|
| **Clima Espacial** | **DONKI — SEP** *(Partículas Solares)* | ✅ **Sí** | `https://api.nasa.gov/DONKI/SEP` | JSON | ✅ `200 OK` | Fechas/horas exactas de impacto de partículas energéticas solares, detectores e IDs de eventos asociados. |
| **Clima Espacial** | **DONKI — CME** *(Eyección Masa Coronal)* | ✅ **Sí** | `https://api.nasa.gov/DONKI/CME` | JSON | ✅ `200 OK` | Erupciones coronales con velocidad (`speed` en `km/s`), ángulo (`halfAngle`) y coordenadas solares. |
| **Clima Espacial** | **DONKI — GST** *(Tormenta Geomagnética)* | ✅ **Sí** | `https://api.nasa.gov/DONKI/GST` | JSON | ✅ `200 OK` | Serie temporal del índice geomagnético planetario `Kp` (escala `0–9`) cada 3 horas. |
| **Clima Espacial** | **DONKI — IPS / HSS / notifications** | ✅ **Sí** | `https://api.nasa.gov/DONKI/{IPS\|HSS\|notifications}` | JSON | ✅ `200 OK` | Choques interplanetarios, corrientes rápidas de viento solar y boletines de alerta espacial. |
| **Clima Espacial** | **DONKI — FLR** *(Llamaradas Solares)* | ✅ **Sí** | `https://api.nasa.gov/DONKI/FLR` | JSON | ❌ `404 Not Found` | **No usar.** El proxy `/DONKI-API/get/FLR/` de la NASA devuelve error 404 actualmente. |
| **Biología / Fisiología** | **OSDR — Metadatos y Lista de Archivos** | ❌ No (Pública) | `https://osdr.nasa.gov/osdr/data/osd/files/{ID}` | JSON | ✅ `200 OK` | Catálogo de archivos por estudio (ej. `OSD-681`). **`OSD-546` NO es de roedores** (es de células madre), descartarlo. |
| **Biología / Fisiología** | **OSDR — Descarga Directa CSV** | ❌ No (Pública) | `https://osdr.nasa.gov/geode-py/ws/studies/OSD-681/download` | CSV | ✅ `200 OK` | Biotelemetría real de presión intracraneal (`torr`) y temperatura corporal (`°C`) en días `0..180` (33 animales). |
| **Dosimetría Real** | **PDS PPI — Curiosity RAD** | ❌ No (Pública) | `https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/` | ASCII `.TXT`/`.LBL` | ✅ `200 OK` | Soles recientes en `SOL_04710_04843/`. Contiene dosis horaria real en $\mu\text{Gy/h}$ (detectores B silicio y E tejido). |
| **Literatura Científica** | **NASA NTRS API** | ❌ No (Pública) | `https://ntrs.nasa.gov/api/citations/search` | JSON | ✅ `200 OK` | Buscador de informes técnicos y papers revisados de la NASA (título, año, autores, abstract y link). |
| **Visual / Orbital (UI)** | **NASA EPIC API (DSCOVR)** | ✅ **Sí** | `https://api.nasa.gov/EPIC/api/natural` | JSON + PNG/JPG | ✅ `200 OK` | Fotografías diarias reales del disco terrestre + coordenadas 3D `J2000` (satélite, Luna, Sol) y `lat/lon`. |
| **Visual / Galería (UI)** | **NASA Image & Video Library** | ❌ No (Pública) | `https://images-api.nasa.gov/search` | JSON + JPG | ✅ `200 OK` | Buscador multimedia oficial (imágenes de tormentas solares SDO, astronautas ISS, blindaje de radiación). |
| **Entorno Espacial (UI)** | **NASA NeoWs (Asteroides)** | ✅ **Sí** | `https://api.nasa.gov/neo/rest/v1/feed` | JSON | ✅ `200 OK` | Objetos cercanos a la Tierra por fecha (diámetro en metros, velocidad en `km/h`, distancia en `km` y lunar). |
| **Visual (UI)** | **APOD / Mars Rover Photos** | ✅ **Sí** | `https://api.nasa.gov/planetary/apod` | JSON | ⚠️ / ❌ | **No usar:** APOD devuelve un logo genérico por redirección a `science.nasa.gov`; Mars Rover Photos da 404. |

> [!WARNING]
> **Regla importante para DONKI:** No usar la URL antigua `https://ccmc.gsfc.nasa.gov/DONKI-API/get/...` citada en el borrador inicial (no responde a peticiones externas directas). Todas las llamadas a DONKI deben hacerse a **`https://api.nasa.gov/DONKI/...`** pasando `api_key`.

---

## Parte II — Especificación Técnica de cada API (Parámetros y Estructura JSON/TXT)

### 1. API DONKI — Space Weather Database (`pipeline/donki.py`)

- **Autenticación:** Query parameter `api_key` (cargado desde `.env` como `NASA_API_KEY`).
- **Límite de cuota verificado:** `10,000` peticiones/hora con API Key registrada.
- **Parámetros comunes:** `startDate=YYYY-MM-DD`, `endDate=YYYY-MM-DD` (se recomienda pedir en bloques de $\le 30$ días).
- **Rango con eventos SEP reales confirmado:** `2026-01-01` a `2026-02-28` (contiene **9 eventos SEP**, **285 CMEs** y **3 tormentas GST**).

#### 1.1. `GET https://api.nasa.gov/DONKI/SEP` (Solar Energetic Particles)
Ejemplo real de respuesta JSON (evento del 18 de enero de 2026):
```json
[
  {
    "sepID": "2026-01-18T22:33:00-SEP-001",
    "eventTime": "2026-01-18T22:33Z",
    "instruments": [
      { "displayName": "SOHO: COSTEP 15.8-39.8 MeV" }
    ],
    "linkedEvents": [
      { "activityID": "2026-01-18T17:27:00-FLR-001" },
      { "activityID": "2026-01-18T18:09:00-CME-001" }
    ],
    "sentNotifications": [
      {
        "messageID": "20260118-AL-006",
        "messageIssueTime": "2026-01-18T22:53Z",
        "messageURL": "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/44040/1"
      }
    ],
    "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/44039/-1"
  }
]
```
- **Campos clave a extraer:**
  - `eventTime` (`string` ISO UTC): Fecha y hora exacta del impacto de partículas.
  - `sepID` (`string`): Identificador único del evento SEP.
  - `instruments[0].displayName` (`string`): Instrumento y rango de energía en MeV.
  - `linkedEvents` (`array`): IDs de la llamarada (`FLR`) o eyección (`CME`) que originó el evento.
  - `link` (`string`): Enlace oficial en CCMC.

#### 1.2. `GET https://api.nasa.gov/DONKI/CME` (Coronal Mass Ejections)
Ejemplo real de respuesta JSON:
```json
[
  {
    "activityID": "2026-10-16T08:00:00-CME-001",
    "catalog": "M2M_CATALOG",
    "startTime": "2026-10-16T08:00Z",
    "sourceLocation": "",
    "activeRegionNum": null,
    "instruments": [
      { "displayName": "SOHO: LASCO/C2" },
      { "displayName": "SOHO: LASCO/C3" }
    ],
    "cmeAnalyses": [
      {
        "isMostAccurate": true,
        "time21_5": "2026-10-16T08:40Z",
        "latitude": 0.0,
        "longitude": null,
        "halfAngle": 36.0,
        "speed": 428.0,
        "type": "S",
        "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CMEAnalysis/49126/-1"
      }
    ],
    "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/..."
  }
]
```
- **Campos clave a extraer:**
  - `startTime` (`string` ISO UTC): Inicio de la eyección coronal.
  - Dentro de `cmeAnalyses[]` (filtrar el objeto donde `"isMostAccurate": true`):
    - `speed` (`float`, unidad: `km/s`): Velocidad de la CME.
    - `halfAngle` (`float`, unidad: `grados`): Mitad del ángulo de apertura.
    - `latitude` / `longitude` (`float`): Dirección de propagación.

#### 1.3. `GET https://api.nasa.gov/DONKI/GST` (Geomagnetic Storms)
Ejemplo real de respuesta JSON:
```json
[
  {
    "gstID": "2026-01-10T18:00:00-GST-001",
    "startTime": "2026-01-10T18:00Z",
    "allKpIndex": [
      {
        "observedTime": "2026-01-10T21:00Z",
        "kpIndex": 6.0,
        "source": "NOAA"
      },
      {
        "observedTime": "2026-01-11T00:00Z",
        "kpIndex": 5.67,
        "source": "NOAA"
      }
    ],
    "linkedEvents": [
      { "activityID": "2026-01-08T05:53:00-CME-001" }
    ],
    "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/GST/43885/-1"
  }
]
```
- **Campos clave a extraer:** De cada elemento en `allKpIndex[]`, extraer `observedTime` (`string` ISO UTC) y `kpIndex` (`float`, escala `0–9`).

---

### 2. API NASA OSDR — Open Science Data Repository (`pipeline/osdr.py`)

Permite inspeccionar metadatos y descargar archivos de estudios biológicos y fisiológicos espaciales sin API Key.

1. **Endpoint de metadatos del estudio:**
   `GET https://osdr.nasa.gov/osdr/data/osd/meta/{OSD_ID}`
2. **Endpoint de listado de archivos descargables:**
   `GET https://osdr.nasa.gov/osdr/data/osd/files/{OSD_ID}`
   ```json
   {
     "studies": {
       "OSD-681": {
         "study_files": [
           {
             "file_name": "LSDS-83_Telemetry - Intracranial Pressure_Fuller_BiotelemetryICP_TRANSFORMED.csv",
             "file_size": 1869,
             "category": "Intracranial Pressure"
           },
           {
             "file_name": "LSDS-83_Telemetry_Fuller_BiotelemetryTb_TRANSFORMED.csv",
             "file_size": 2410,
             "category": "Core Body Temperature"
           }
         ]
       }
     }
   }
   ```
3. **Endpoint de descarga directa de archivo:**
   `GET https://osdr.nasa.gov/geode-py/ws/studies/OSD-{OSD_ID}/download?source=datamanager&file={FILE_NAME_URL_ENCODED}`

4. **Estructura de los CSV descargados de `OSD-681` (`LSDS-83`):**
   - **Presión intracraneal (`torr`):**
     ```csv
     Sample Name,Day_0_Intracranial_Pressure_torr,Day_30_Intracranial_Pressure_torr,Day_60_Intracranial_Pressure_torr,Day_90_Intracranial_Pressure_torr,Day_120_Intracranial_Pressure_torr,Day_150_Intracranial_Pressure_torr,Day_180_Intracranial_Pressure_torr
     MT130_SubduralSpace,5.65,6.51,5.60,4.93,2.40,2.21,1.87
     MT131_SubduralSpace,4.17,4.85,4.67,4.91,3.63,3.63,3.57
     ```
   - **Temperatura corporal (`°C`):**
     ```csv
     Sample Name,Baseline_Average_Body_Temperature_degree_Celsius,Day_0_Average_Body_Temperature_degree_Celsius,Day_30_...,Day_180_...
     MT293_SubcutaneousTissue,36.166,,35.956,36.191,36.004,,36.282,36.444,
     ```

---

### 3. NASA PDS PPI — Dosimetría Curiosity RAD (`pipeline/curiosity_rad.py`)

- **Directorio público de datos recientes (2025–2026):**
  `https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_04710_04843/`
- **Archivos por Sol marciano:**
  - Datos ASCII: `RAD_RDR_{YYYY}_{DOY}_{HH}_{MM}_{SOL}_V00.TXT` (ej. `RAD_RDR_2026_080_17_18_4843_V00.TXT`)
  - Metadatos y unidades PDS: `RAD_RDR_{YYYY}_{DOY}_{HH}_{MM}_{SOL}_V00.LBL`
- **Estructura real dentro del archivo `.TXT`:**
  ```text
  [FILE]
  START_SOL=4843
  START_TIME="2026-080 17:18:00"

  [OBSERVATION: 00]
  START_OBS_MARS="4843 0:44:27"
  START_OBS_UTC="2026-080 17:18:00"
  OBS_DURATION=961

  [DOSIMETRY_TOTAL_DOSE_B: 00]
  6.36349

  [DOSIMETRY_TOTAL_DOSE_E: 00]
  6.26193
  ```
- **Significado y unidades (verificadas en `.LBL`):**
  - `UNIT = "microGray / Hour"` ($\mu\text{Gy/h}$)
  - `DOSIMETRY_TOTAL_DOSE_B`: Detector B (Silicio).
  - `DOSIMETRY_TOTAL_DOSE_E`: Detector E (Plástico equivalente a tejido humano; ~$6.26\ \mu\text{Gy/h} \times 24 / 1000 \approx 0.15\ \text{mGy/día}$).

---

### 4. API NASA NTRS — Technical Reports Server (`pipeline/ntrs.py`)

- **Endpoint:** `GET https://ntrs.nasa.gov/api/citations/search?q={CONSULTA}&page.size=10`
- **Ejemplo real de respuesta JSON:**
  ```json
  {
    "stats": { "took": 89, "total": 4 },
    "results": [
      {
        "id": 20040089526,
        "title": "Adaptive responses of the cardiovascular system to prolonged spaceflight conditions: assessment with Holter monitoring",
        "stiType": "REPRINT",
        "distribution": "PUBLIC",
        "abstract": "This article presents selected findings obtained with Holter monitoring from two crew members of the expedition, performed during a 175-day space mission...",
        "authorAffiliations": [
          { "meta": { "author": { "name": "Baevsky, R. M." } } }
        ],
        "publications": [
          { "publicationDate": "1997-06-01T00:00:00.0000000+00:00" }
        ],
        "downloadsAvailable": false
      }
    ]
  }
  ```
- **Construcción del link público a cada paper:** `https://ntrs.nasa.gov/citations/{id}`

---

### 5. APIs Visuales, Multimedia y Contexto Espacial para UI (`pipeline/media_context.py`)

#### 5.1. NASA EPIC API — Fotos de la Tierra y Vectores Orbitales J2000
- **Endpoint de metadatos:** `GET https://api.nasa.gov/EPIC/api/natural?api_key=TU_KEY`
- **Ejemplo real del JSON devuelto por la NASA:**
  ```json
  [
    {
      "identifier": "20261112000830",
      "caption": "This image was taken by NASA's EPIC camera onboard the NOAA DSCOVR spacecraft",
      "image": "epic_1b_20261112000830",
      "date": "2026-11-12 00:03:42",
      "centroid_coordinates": { "lat": -11.564941, "lon": 164.919434 },
      "dscovr_j2000_position": { "x": -1128365.39, "y": -871346.05, "z": -288296.57 },
      "lunar_j2000_position": { "x": -73249.53, "y": -350718.45, "z": -187053.97 },
      "sun_j2000_position": { "x": -96691655.19, "y": -102929376.8, "z": -44617550.12 }
    }
  ]
  ```
- **Construcción de las URLs públicas de imagen (no requieren ni exponen tu API Key):**
  Separando `date` en `YYYY`, `MM`, `DD`:
  - **PNG Alta Resolución (~3 MB):** `https://epic.gsfc.nasa.gov/archive/natural/{YYYY}/{MM}/{DD}/png/{image}.png`
  - **Miniatura JPG (~50 KB, rápida para UI):** `https://epic.gsfc.nasa.gov/archive/natural/{YYYY}/{MM}/{DD}/thumbs/{image}.jpg`

#### 5.2. NASA Image and Video Library API — Galería Multimedia Oficial
- **Endpoint (sin API Key):** `GET https://images-api.nasa.gov/search?q={QUERY}&media_type=image`
- **Ejemplo real de estructura JSON:**
  ```json
  {
    "collection": {
      "items": [
        {
          "data": [
            {
              "nasa_id": "GSFC_20171208_Archive_e001435",
              "title": "Strong Solar Flare Erupts",
              "date_created": "2013-05-13T00:00:00Z",
              "center": "GSFC",
              "description": "NASA's Solar Dynamics Observatory captured this image..."
            }
          ],
          "links": [
            {
              "href": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~thumb.jpg",
              "rel": "preview",
              "render": "image"
            }
          ]
        }
      ]
    }
  }
  ```

#### 5.3. NASA NeoWs API — Asteroides Cercanos (`GET https://api.nasa.gov/neo/rest/v1/feed`)
- **Parámetros:** `start_date=YYYY-MM-DD`, `end_date=YYYY-MM-DD`, `api_key=TU_KEY`
- **Campos clave en `near_earth_objects[YYYY-MM-DD][]`:**
  - `name`: Nombre del asteroide.
  - `is_potentially_hazardous_asteroid`: Booleano (`true`/`false`).
  - `estimated_diameter.meters.estimated_diameter_min` / `max`: Tamaño en metros.
  - `close_approach_data[0].relative_velocity.kilometers_per_hour`: Velocidad en `km/h`.
  - `close_approach_data[0].miss_distance.kilometers` / `lunar`: Distancia mínima de paso a la Tierra.

---

## Parte III — Guía Agnóstica de Cruce con Datos Fisiológicos y de Salud (`deep-research-report.md`)

Esta sección define **con qué variables fisiológicas, conductuales o ambientales se cruza cada API** cuando el equipo integre el modelo de salud del astronauta.

### 1. Matriz Maestra de Cruces: API NASA $\times$ Dominios Fisiológicos

| API / Recurso NASA | Variables que Entrega (`variable`) | Llave de Cruce (`Join Key`) | ¿Con qué Dominio Fisiológico / Módulo se cruza según `deep-research-report.md`? | Mecanismo y Lógica del Cruce (Agnóstico al Dataset) |
|---|---|---|---|---|
| **1. DONKI — `SEP`** *(Partículas Solares)* | `sep_event` (`flag=1`, `real`) | Fecha UTC (`timestamp[:10]`) y ventana `[t, t+2 días]` | **Radiación** (`dosis_diaria`) + **Cardiovascular** (`FC`, `HRV`) + **Sueño/Conductual** (`horas_sueño`, `estrés`) | Un evento `SEP` dispara un pico agudo de radiación y actúa como estresor operacional: en los días $t$ a $t+2$ se cruza con reducción de horas de sueño ($<6\text{ h}$), aumento de estrés subjetivo, caída de HRV y elevación de FC ($+15\text{ a }+20\text{ bpm}$ sobre basal). |
| **2. DONKI — `CME`** *(Eyección Masa Coronal)* | `cme_speed` (`km/s`, `real`) | Fecha/Hora UTC (`timestamp`) | **Radiación Ambiental** + **Alertas Preventivas** | Las CME rápidas ($> 500\text{–}1000\text{ km/s}$) preceden tormentas geomagnéticas y eventos SEP; sirven como indicador de **alerta temprana** antes de que suba la dosis del astronauta. |
| **3. DONKI — `GST`** *(Tormenta Geomagnética)* | `kp_index` (`Kp 0–9`, `real`) | Fecha/Hora UTC (`timestamp`) | **Radiación en LEO** + **Regulación Autonómica** | Valores de `Kp >= 5` indican tormenta geomagnética que reduce el blindaje magnetosférico en órbita baja (LEO), incrementando la tasa de dosis diaria y correlacionándose con alteración autonómica. |
| **4. OSDR — `OSD-681`** *(Head-Down Tilt)* | `intracranial_pressure` (`torr`), `body_temperature` (`degC`) (`real`) | Día relativo de misión (`mission_day`: `-1, 0, 30..180`) | **Circulatorio / Fluido Cefálico (ICP/SANS)** + **Cardiovascular / Termorregulación** | Provee la **curva biológica real en análogo de microgravedad**. Se cruza por `mission_day` como proxy de desplazamiento cefálico de fluidos y línea base real para calibrar la deriva longitudinal de FC/PA y temperatura. |
| **5. PDS — `Curiosity RAD`** *(Dosimetría Real)* | `rad_dose_rate_e` (`uGy/h`), `rad_daily_dose_mars` (`mGy/day`) | Fecha/Hora UTC o Día de misión (`mission_day`) | **Radiación** (Dosis basal diaria y acumulada en `mGy`) | Provee **mediciones físicas reales de un dosímetro espacial** (~$6.2\ \mu\text{Gy/h} \approx 0.15\text{ mGy/día}$). Se cruza con el modelo de radiación para fijar el piso real de dosis diaria (basal) sobre el cual DONKI `SEP` inyecta los picos. |
| **6. NTRS API** *(Literatura Científica)* | `ntrs_id`, `titulo`, `resumen`, `url` | Dominio fisiológico (`cardio`, `hrv`, `sleep`, `radiation`, `icp`) | **Motor de Alertas Explicables** + **Justificación de Umbrales (`Baseline / Z-score`)** | Se cruza **por regla médica/alerta**: cada umbral crítico (ej. `FC > 100 bpm` o `|z| > 2`, `sueño < 6h`, `dosis > 0.5 mGy`) se vincula a un paper de NTRS que justifica científicamente la alerta. |
| **7. EPIC API (DSCOVR)** *(Tierra y Órbita L1)* | `image_jpg_thumb`, `centroid_lat/lon`, `dscovr_j2000_km` | Timestamp UTC (`timestamp_utc`) | **Contexto Orbital del Dashboard** (Línea 89 de `deep-research-report.md`) | Se cruza con el reloj de misión en el Frontend para mostrar la última posición orbital, coordenadas sub-satélite y vista real de la Tierra desde L1. |
| **8. NASA Image Library** *(Galería Multimedia)* | `image_url`, `title`, `nasa_id` por categoría | Tipo de alerta activa (`solar_storm_sdo`, `iss_astronaut_health`, etc.) | **Tarjetas Visuales del Frontend y Panel de Alertas** | Se cruza con el **tipo de alerta activa**: si la alerta es por radiación/SEP, muestra una foto real del Sol (SDO); si es fisiológica, muestra monitoreo médico en la ISS. |

---

### 2. Reglas de Cruce por Dominio Fisiológico (Para Backend / Ciencia de Datos)

#### A) Cruce para el Dominio de Radiación (`DONKI` + `Curiosity RAD` $\rightarrow$ Dosis del Astronauta)
- **Entradas de las APIs:**
  - `curiosity_rad.csv` (`variable == "rad_daily_dose_mars"` o promedio de `"rad_dose_rate_e"`).
  - `donki_events.csv` (`variable == "sep_event"` y `"kp_index"`).
- **Lógica de cruce:**
  Para cada día $t$ de la misión del astronauta:
  1. Tomar la dosis basal diaria escalada desde la serie real de dosimetría (`Curiosity RAD`).
  2. Hacer `LEFT JOIN` por fecha (`timestamp[:10]`) contra `donki_events.csv`.
  3. Si ese día hay `sep_event == 1`, sumar el pico de exposición por partículas solares ($\Delta\text{Dosis}_{\text{SEP}}$). Si `kp_index >= 5`, sumar el incremento por tormenta geomagnética ($\Delta\text{Dosis}_{\text{GST}}$).
  4. Acumular día a día en `radiation_cum_dose` (`source_type = "derived"`).

#### B) Cruce para los Dominios Cardiovascular (`FC`, `HRV`) y Sueño/Estrés (`sleep`, `stress`)
- **Entradas de las APIs:**
  - `donki_events.csv` (fechas de eventos `SEP` y `GST`).
  - `osdr_OSD-681.csv` (tendencia longitudinal de `intracranial_pressure` y `body_temperature`).
  - `ntrs_referencias.csv` (parámetros de referencia en vuelo espacial, ej. NTRS `20040089526`).
- **Lógica de cruce:**
  1. **Línea basal individual (primeros días de misión):** Frecuencia cardíaca en reposo ~$65\text{–}75\text{ bpm}$, sueño ~$7\text{–}8\text{ h}$, HRV RMSSD ~$40\text{–}50\text{ ms}$.
  2. **Modulación longitudinal por microgravedad (`OSDR OSD-681`):** Cruzar por `mission_day` con la curva de presión intracraneal (`intracranial_pressure`) para reflejar la adaptación progresiva al desplazamiento de fluidos.
  3. **Respuesta sinérgica ante eventos solares (`DONKI SEP`):** Cuando `donki_events.csv` registra un `sep_event` en el día $t$, durante la ventana $[t, t+2]$ se cruza con las series fisiológicas (`source_type = "synthetic"`) produciendo:
     - Elevación sostenida de `heart_rate` ($+15\text{ a }+20\text{ bpm}$ sobre la mediana basal).
     - Descenso de `hrv_rmssd` y de `sleep_duration` ($<6\text{ h}$).
     - Incremento de `stress_score`.

#### C) Cruce para el Motor de Detección de Anomalías y Alertas Explicables (`Z-score Robusto` + `NTRS`)
- Para cada variable fisiológica $X$ del astronauta, se calcula su Z-score robusto respecto a su línea basal:
  $$z_{\text{robusto}}(t) = \frac{X(t) - \text{Mediana}(X_{\text{basal}})}{1.4826 \cdot \text{MAD}(X_{\text{basal}})}$$
- **Fusión multidominio:** Cuando coinciden en el mismo día:
  - $z_{\text{FC}} > +2.5$ (frecuencia cardíaca anormalmente alta),
  - $z_{\text{sueño}} < -2.0$ o $\text{sueño} < 6\text{ h}$ (recuperación deficiente), y
  - Evento `SEP` reciente en `donki_events.csv` o pico en `radiation_daily_dose` ($> 0.6\text{ mGy}$),
  el motor emite una **Alerta Crítica Sinérgica** y la cruza con `ntrs_referencias.csv` para adjuntar la cita científica oficial de la NASA.

---

## Parte IV — Contrato de Datos Unificado y Archivos Entregables

Todos los conectores en `pipeline/` exportan sus resultados a `pipeline/data/processed/` bajo el mismo esquema tabular de **9 columnas** para que cualquier miembro del equipo pueda hacer `merge` / `JOIN` directo:

| Columna | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `subject_id` | `string` | Identificador del sujeto o entorno (`ENV`, `MSL-Curiosity`, `MT131_SubduralSpace`, `ASTR-1`) | `ENV` |
| `timestamp` | `string` | Fecha/hora en formato ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`) | `2026-01-18T22:33Z` |
| `mission_day` | `int/empty` | Día relativo de misión/experimento o Sol marciano | `18` |
| `variable` | `string` | Nombre estandarizado del indicador | `sep_event`, `cme_speed`, `kp_index`, `intracranial_pressure`, `body_temperature`, `rad_dose_rate_e`, `heart_rate`, `sleep_duration` |
| `valor` | `float` | Valor numérico de la medición | `428.0` |
| `unidad` | `string` | Unidad física de la variable | `flag`, `km/s`, `Kp`, `torr`, `degC`, `uGy/h`, `mGy/day`, `bpm`, `hours` |
| `fuente` | `string` | Origen exacto del registro | `DONKI-SEP`, `OSDR OSD-681`, `PDS MSL-RAD-RDR` |
| `source_type` | `string` | Etiqueta de trazabilidad exigida por el reto: `real`, `derived` o `synthetic` | `real` |
| `ref` | `string` | URL directa al registro/archivo oficial de la NASA | `https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/44039/-1` |

### Resumen de Archivos en `pipeline/`

1. **Scripts Conectores (`pipeline/`):**
   - `common.py` — Cliente HTTP con reintentos, carga de `.env` y exportador al esquema de 9 columnas.
   - `donki.py` — Descarga y normaliza `SEP`, `CME` y `GST` desde `api.nasa.gov/DONKI`.
   - `osdr.py` — Descarga y normaliza la biotelemetría `OSD-681` desde `osdr.nasa.gov`.
   - `curiosity_rad.py` — Descarga y normaliza la dosimetría marciana desde `pds-ppi.igpp.ucla.edu`.
   - `ntrs.py` — Descarga las referencias científicas desde `ntrs.nasa.gov/api`.
   - `media_context.py` — Descarga el contexto orbital `EPIC` y el catálogo visual de `images-api.nasa.gov`.
   - `simulate_and_merge.py` — Ejemplo funcional de cruce, generación de series sintéticas y motor de alertas Z-score robusto.
   - `run_all.py` — Ejecuta todos los pasos anteriores en orden.

2. **Datos Procesados Listos para Consumir (`pipeline/data/processed/`):**
   - `donki_events.csv` (311 filas `real`)
   - `osdr_OSD-681.csv` (397 filas `real`)
   - `curiosity_rad.csv` (877 filas `real` + `derived`)
   - `ntrs_referencias.csv` (38 referencias científicas con URLs)
   - `epic_orbital_context.json` (6 capturas orbitales de la Tierra con coordenadas J2000)
   - `nasa_ui_visual_assets.json` (16 imágenes oficiales de la NASA en 4 categorías para el UI)
   - `astra_unified_dataset.csv` (1,765 filas unificadas) y `astra_alerts.json` (6 alertas críticas explicadas)
