# Módulo «Bienestar y sueño»

Cubre lo que pide el reto y que los análisis de sangre no ven: **salud conductual, sueño y recuperación**, día a día. Corresponde al peligro **aislamiento y confinamiento** de los 5 peligros del vuelo espacial (NASA HRP).

Ruta: `/system/wellbeing`. Tiene tres vistas en la barra lateral: **Registro de hoy**, **Tendencias** y **Wearable**.

## Qué registra

| Fuente | Datos | Cómo entra |
|---|---|---|
| Registro diario (menos de 1 minuto) | Horas y calidad del sueño, ánimo, estrés, cansancio, carga de trabajo, conexión con los demás (escalas 1–5), síntomas y una nota | Formulario en «Registro de hoy». Hay uno por día y se puede corregir |
| Wearable | Pulso en reposo, variabilidad cardiaca (RMSSD), horas de sueño, oxígeno (SpO₂), minutos activos, temperatura de la piel | CSV con una fila por día (plantilla en «Wearable») |

Todo se guarda en la base de datos local (SQLite en la app de escritorio, tabla `daily`) y se sincroniza con el sistema online como el resto.

## Cómo analiza

- **Línea base personal:** la mediana de los primeros 7 días de cada persona.
- **Ventana de análisis:** los últimos 3 días.
- **Riesgo de bienestar** de 0 a 100, experimental.

| Alerta | Regla | Riesgo NASA HRP |
|---|---|---|
| Pérdida de sueño | 2 o más de las últimas 3 noches con menos de 6 h | Pérdida de sueño, desajuste circadiano y sobrecarga de trabajo |
| Ánimo bajo o aislamiento | Ánimo o conexión con los demás en 1–2 de 5, al menos 2 veces | Condiciones cognitivas o conductuales adversas |
| Estrés con carga alta | Estrés 4–5 al menos 2 días y carga de trabajo alta | Sobrecarga de trabajo y rendimiento |
| Recuperación baja | Variabilidad cardiaca 20 % por debajo de la base durante 2 días (crítica si además el pulso en reposo sube más de un 10 %) | Adaptaciones cardiovasculares |
| Oxígeno bajo | SpO₂ por debajo de 94 % | Ambiente cerrado y hostil |
| Cambios en la visión | Síntoma reportado | Síndrome neuro-ocular asociado al vuelo (SANS) |
| Dolor de cabeza con congestión | Ambos síntomas | Ambiente cerrado (CO₂ de la cabina) |

Cada alerta explica qué pasa, qué hacer y a qué riesgo se refiere.

## ¿Es posible en órbita?

- La **CSA** usa en la ISS el **Bio-Monitor**, una prenda inteligente que registra pulso, respiración, presión, oxígeno, temperatura y actividad. ASTRA importa una exportación diaria de ese tipo.
- La **NASA** recoge a bordo cuestionarios breves de sueño y ánimo y pruebas cognitivas dentro de sus medidas estándar de vuelo.
- El análisis corre en el propio equipo, sin internet, y se sincroniza al volver la conexión.

## Límites

- No hay datos públicos de wearables de una tripulación real. El botón «Cargar ejemplo simulado» genera 16 días marcados como **SIMULADO**: 9 estables y una última semana difícil.
- Las escalas son de autoinforme y orientativas, no un cuestionario clínico validado. El riesgo es experimental y las alertas son señales, no diagnósticos.

## Verificación

- `bun scripts/check-wellbeing.ts` (en `frontend/`): el ejemplo da riesgo 100 y 5 alertas (sueño, ánimo, estrés, recuperación y CO₂). La plantilla CSV se lee bien y un CSV sin fecha se rechaza.
- En la app empaquetada: se carga el ejemplo, se guardan 32 registros en SQLite pendientes de sincronizar y se muestran las alertas y las tendencias.
