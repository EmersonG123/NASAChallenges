"""Dashboard interactivo del sistema ASTRA (Streamlit + Plotly).

Ejecución:
  streamlit run dashboard.py
"""
import json
import math
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

ROOT = Path(__file__).resolve().parent
PROC = ROOT / "data" / "processed"

st.set_page_config(
    page_title="ASTRA | Monitoreo de Salud Espacial NASA",
    page_icon="🛰️",
    layout="wide",
)


@st.cache_data
def cargar_datos():
    df = pd.read_csv(PROC / "astra_unified_dataset.csv")
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
    df["mission_day_num"] = pd.to_numeric(df["mission_day"], errors="coerce")

    alertas = json.loads((PROC / "astra_alerts.json").read_text(encoding="utf-8"))
    ntrs = pd.read_csv(PROC / "ntrs_referencias.csv")

    epic_path = PROC / "epic_orbital_context.json"
    epic = json.loads(epic_path.read_text(encoding="utf-8")) if epic_path.exists() else []

    ui_path = PROC / "nasa_ui_visual_assets.json"
    ui_assets = json.loads(ui_path.read_text(encoding="utf-8")) if ui_path.exists() else {}

    return df, alertas, ntrs, epic, ui_assets


df, alertas, ntrs, epic, ui_assets = cargar_datos()

# --- Barra Lateral: Contexto Orbital en Vivo (NASA EPIC) ---
with st.sidebar:
    st.header("🌍 Contexto Orbital (NASA EPIC)")
    if epic:
        opciones_epic = [f"{i+1}. {e['timestamp_utc']}" for i, e in enumerate(epic)]
        sel_idx = st.selectbox("Captura satélite DSCOVR:", range(len(epic)), format_func=lambda i: opciones_epic[i])
        actual = epic[sel_idx]
        st.image(actual["image_jpg_thumb"], caption=f"DSCOVR EPIC — {actual['timestamp_utc']}", use_container_width=True)

        pos = actual.get("dscovr_j2000_km") or {}
        dist_km = math.sqrt(sum(float(pos.get(k, 0)) ** 2 for k in ("x", "y", "z")))
        st.markdown(
            f"- **Centro (Lat/Lon):** `{actual['centroid_lat']:.2f}°, {actual['centroid_lon']:.2f}°`\n"
            f"- **Distancia DSCOVR (L1):** `{dist_km:,.0f} km`\n"
            f"- [Abrir PNG Alta Resolución]({actual['image_png_url']})"
        )
    else:
        st.info("Ejecuta `python media_context.py` para cargar imágenes de EPIC.")

    if ui_assets.get("iss_astronaut_health"):
        st.divider()
        st.subheader("👨‍🚀 Monitoreo Médico ISS")
        iss_img = ui_assets["iss_astronaut_health"][0]
        st.image(iss_img["image_url"], caption=iss_img["title"], use_container_width=True)

# --- Encabezado ---
st.title("🛰️ ASTRA — Monitoreo Fisiológico y Radiación Espacial")
st.caption(
    "Integración trazable de recursos oficiales NASA: **DONKI API** (Clima Espacial), "
    "**OSDR OSD-681** (Biotelemetría ICP/Temperatura), **PDS Curiosity RAD** (Dosimetría), "
    "**NTRS** (Evidencia Científica) y **EPIC + NASA Image Library** (Contexto Visual/Orbital)."
)

# --- Métricas globales ---
col1, col2, col3, col4, col5 = st.columns(5)
conteo_tipos = df["source_type"].value_counts().to_dict()

col1.metric("Total Registros", f"{len(df):,}")
col2.metric("Datos REALES (NASA)", f"{conteo_tipos.get('real', 0):,}")
col3.metric("Datos DERIVADOS", f"{conteo_tipos.get('derived', 0):,}")
col4.metric("Datos SINTÉTICOS", f"{conteo_tipos.get('synthetic', 0):,}")
col5.metric("Alertas Críticas", f"{len(alertas)}", delta="Días 18–23 (Post-SEP)", delta_color="inverse")

tab1, tab2, tab3, tab4 = st.tabs([
    "👨‍🚀 1. Monitoreo Astronauta (ASTR-1) y Alertas",
    "🔬 2. Datos Reales NASA (OSDR, DONKI, Curiosity RAD)",
    "🖼️ 3. Galería Visual & Contexto Orbital (EPIC + NASA Media)",
    "📚 4. Referencias NTRS y Dataset Unificado",
])

# =====================================================================
# TAB 1: TELEMETRÍA ASTR-1 Y ALERTAS EXPLICABLES
# =====================================================================
with tab1:
    astr = df[df["subject_id"] == "ASTR-1"].copy()
    piv = astr.pivot(index="mission_day_num", columns="variable", values="valor").reset_index()
    dias_alerta = [a["mission_day"] for a in alertas]

    st.subheader("Línea de Tiempo de Misión (30 días) — Correlación Radiación vs. Fisiología")

    fig = make_subplots(
        rows=4, cols=1, shared_xaxes=True, vertical_spacing=0.06,
        subplot_titles=(
            "Dosis Diaria de Radiación (mGy) — [DERIVED de DONKI SEP]",
            "Frecuencia Cardíaca Media (bpm) — [SYNTHETIC calibrado con NTRS]",
            "Variabilidad Cardíaca HRV RMSSD (ms) — [SYNTHETIC]",
            "Horas de Sueño y Nivel de Estrés — [SYNTHETIC]",
        ),
    )

    fig.add_trace(
        go.Bar(
            x=piv["mission_day_num"], y=piv["radiation_daily_dose"],
            name="Dosis diaria (mGy)", marker_color="#f59e0b",
        ),
        row=1, col=1,
    )
    fig.add_hline(y=0.60, line_dash="dash", line_color="#ef4444", annotation_text="Umbral Alerta (0.60 mGy)", row=1, col=1)

    fig.add_trace(
        go.Scatter(
            x=piv["mission_day_num"], y=piv["heart_rate"],
            mode="lines+markers", name="FC (bpm)", line=dict(color="#ef4444", width=2.5),
        ),
        row=2, col=1,
    )
    fig.add_hline(y=70, line_dash="dot", line_color="#10b981", annotation_text="Basal (~70 bpm)", row=2, col=1)

    fig.add_trace(
        go.Scatter(
            x=piv["mission_day_num"], y=piv["hrv_rmssd"],
            mode="lines+markers", name="HRV RMSSD (ms)", line=dict(color="#3b82f6", width=2),
        ),
        row=3, col=1,
    )

    fig.add_trace(
        go.Scatter(
            x=piv["mission_day_num"], y=piv["sleep_duration"],
            mode="lines+markers", name="Sueño (h)", line=dict(color="#8b5cf6", width=2.5),
        ),
        row=4, col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=piv["mission_day_num"], y=piv["stress_score"],
            mode="lines", name="Estrés (1-10)", line=dict(color="#ec4899", dash="dot"),
        ),
        row=4, col=1,
    )
    fig.add_hline(y=6.0, line_dash="dash", line_color="#ef4444", annotation_text="Mínimo Sueño (6h)", row=4, col=1)

    if dias_alerta:
        fig.add_vrect(
            x0=min(dias_alerta) - 0.4, x1=max(dias_alerta) + 0.4,
            fillcolor="rgba(239, 68, 68, 0.12)", line_width=0,
            annotation_text="⚠️ Ventana de Alerta Sinérgica Post-SEP",
            annotation_position="top left",
        )

    fig.update_layout(height=760, template="plotly_dark", hovermode="x unified")
    fig.update_xaxes(title_text="Día de Misión (Enero 2026)", row=4, col=1)
    st.plotly_chart(fig, use_container_width=True)

    # --- Panel de alertas explicables + Imagen de Evento Solar ---
    st.subheader("🚨 Panel de Alertas Explicables ASTRA (Z-Score Robusto Mediana/MAD)")
    al_col1, al_col2 = st.columns([2.2, 1])
    with al_col1:
        for a in alertas:
            with st.expander(f"🔴 [{a['level']}] Día {a['mission_day']} ({a['date']}) — {', '.join(a['triggers'])}", expanded=True):
                st.markdown(f"**¿Qué cambió?** {a['explanation']}")
                st.markdown(f"**Acción sugerida:** {a['recommendation']}")
                st.markdown(f"**Evidencia científica NASA NTRS:** [{a['ntrs_reference']}]({a['ntrs_reference']})")
    with al_col2:
        if ui_assets.get("solar_storm_sdo"):
            st.markdown("##### ☀️ Contexto Visual: Evento Solar (NASA SDO)")
            for s_img in ui_assets["solar_storm_sdo"][:2]:
                st.image(s_img["image_url"], caption=f"{s_img['title']} ({s_img['nasa_id']})", use_container_width=True)

# =====================================================================
# TAB 2: DATOS REALES NASA (OSDR, CURIOSITY RAD, DONKI)
# =====================================================================
with tab2:
    c1, c2 = st.columns(2)

    with c1:
        st.subheader("🐭 NASA OSDR OSD-681: Presión Intracraneal Real (torr)")
        st.caption("33 sujetos en modelo Head-Down Tilt (días 0 a 180) — source_type: `real`")
        icp = df[(df["fuente"] == "OSDR OSD-681") & (df["variable"] == "intracranial_pressure")]
        fig_icp = px.box(
            icp, x="mission_day_num", y="valor", points="all",
            labels={"mission_day_num": "Día de estudio", "valor": "Presión Intracraneal (torr)"},
            color_discrete_sequence=["#38bdf8"], template="plotly_dark",
        )
        st.plotly_chart(fig_icp, use_container_width=True)

    with c2:
        st.subheader("🐭 NASA OSDR OSD-681: Temperatura Corporal Real (°C)")
        st.caption("Biotelemetría longitudinal (Baseline = día -1, días 0 a 180) — source_type: `real`")
        tb = df[(df["fuente"] == "OSDR OSD-681") & (df["variable"] == "body_temperature")]
        fig_tb = px.box(
            tb, x="mission_day_num", y="valor", points="all",
            labels={"mission_day_num": "Día de estudio (-1 = Basal)", "valor": "Temperatura (°C)"},
            color_discrete_sequence=["#34d399"], template="plotly_dark",
        )
        st.plotly_chart(fig_tb, use_container_width=True)

    c3, c4 = st.columns(2)

    with c3:
        st.subheader("🔴 NASA PDS Curiosity RAD: Tasa de Dosis Real (uGy/h)")
        st.caption("Detectores B (Silicio) y E (Tejido) en Marte (Soles 4839–4843) — source_type: `real`")
        rad_df = df[df["subject_id"] == "MSL-Curiosity"].copy()
        rad_rates = rad_df[rad_df["variable"].isin(["rad_dose_rate_b", "rad_dose_rate_e"])]
        fig_rad = px.line(
            rad_rates, x="timestamp", y="valor", color="variable",
            labels={"timestamp": "Fecha/Hora UTC", "valor": "Tasa de dosis (uGy/h)"},
            template="plotly_dark",
        )
        st.plotly_chart(fig_rad, use_container_width=True)

    with c4:
        st.subheader("☀️ NASA DONKI: Velocidad de CMEs y Eventos SEP Reales")
        st.caption("Enero–Febrero 2026 (285 CMEs y 9 eventos SEP) — source_type: `real`")
        cme_df = df[df["variable"] == "cme_speed"].copy()
        sep_df = df[df["variable"] == "sep_event"].copy()
        fig_cme = px.scatter(
            cme_df, x="timestamp", y="valor",
            labels={"timestamp": "Fecha UTC", "valor": "Velocidad CME (km/s)"},
            color="valor", color_continuous_scale="Turbo", template="plotly_dark",
        )
        for _, r_sep in sep_df.iterrows():
            fig_cme.add_vline(x=r_sep["timestamp"], line_dash="dot", line_color="#ef4444")
        st.plotly_chart(fig_cme, use_container_width=True)

# =====================================================================
# TAB 3: GALERÍA VISUAL Y CONTEXTO ORBITAL (EPIC + NASA IMAGE LIBRARY)
# =====================================================================
with tab3:
    st.subheader("🌍 Secuencia de Rotación Terrestre y Vectores J2000 (API NASA EPIC)")
    st.caption("Imágenes tomadas por el satélite DSCOVR desde el punto de Lagrange L1 (~1.5 millones de km)")
    if epic:
        cols_epic = st.columns(len(epic))
        for idx, item in enumerate(epic):
            with cols_epic[idx]:
                st.image(item["image_jpg_thumb"], use_container_width=True)
                st.caption(
                    f"**{item['timestamp_utc'][11:19]} UTC**\n"
                    f"Lat: `{item['centroid_lat']:.1f}°` | Lon: `{item['centroid_lon']:.1f}°`\n"
                    f"[PNG HD]({item['image_png_url']})"
                )

    st.divider()
    st.subheader("🖼️ Catálogo Visual Oficial para UI (API NASA Image & Video Library)")
    nombres_temas = {
        "solar_storm_sdo": "☀️ Tormentas Solares y Llamaradas (SDO)",
        "iss_astronaut_health": "👨‍🚀 Salud y Monitoreo Médico de Astronautas (ISS)",
        "space_radiation": "🛡️ Radiación Espacial y Blindaje",
        "curiosity_mars_rad": "🔴 Superficie Marciana y Rover Curiosity",
    }
    for clave, titulo_seccion in nombres_temas.items():
        items_tema = ui_assets.get(clave, [])
        if not items_tema:
            continue
        st.markdown(f"#### {titulo_seccion}")
        g_cols = st.columns(len(items_tema))
        for i, asset in enumerate(items_tema):
            with g_cols[i]:
                st.image(asset["image_url"], use_container_width=True)
                st.caption(f"**{asset['title']}** ({asset['date_created']})\nID: `{asset['nasa_id']}`")

# =====================================================================
# TAB 4: EVIDENCIA CIENTÍFICA NTRS Y EXPLORADOR DE DATOS
# =====================================================================
with tab4:
    st.subheader("📚 Evidencia Científica Extraída de NASA NTRS (38 referencias)")
    st.dataframe(
        ntrs[["consulta", "anio", "titulo", "autores", "pdf_disponible", "url"]],
        use_container_width=True, hide_index=True,
    )

    st.subheader("🗂️ Explorador del Dataset Unificado (`astra_unified_dataset.csv`)")
    f_col1, f_col2 = st.columns(2)
    tipos_sel = f_col1.multiselect(
        "Filtrar por source_type:",
        options=sorted(df["source_type"].unique()),
        default=sorted(df["source_type"].unique()),
    )
    vars_sel = f_col2.multiselect(
        "Filtrar por variable:",
        options=sorted(df["variable"].unique()),
        default=sorted(df["variable"].unique()),
    )
    filtrado = df[df["source_type"].isin(tipos_sel) & df["variable"].isin(vars_sel)]
    st.dataframe(filtrado.drop(columns=["mission_day_num"]), use_container_width=True, hide_index=True)
