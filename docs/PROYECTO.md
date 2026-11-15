# 🛰️ ASTRA: Autonomous Space Health Intelligence

> **Gemelo digital de cuerpo completo para astronautas.** ASTRA integra datos **reales** de la NASA de la tripulación de SpaceX Inspiration4 (sangre, defensas, inflamación, corazón, riñón, hígado, piel y microbioma) con el clima espacial de **NASA DONKI**. Con eso detecta, persona por persona, qué sistemas del cuerpo se desvían de lo normal, cuánto riesgo suman y qué hacer.

**Reto:** NASA Space Apps Challenge 2026 · **Categoría:** salud de la tripulación · **Entrega:** 15 nov 2026

---

## 0. ASTRA en 4 bloques

### 🎯 Segmento

| Segmento | Quién es | Qué necesita |
|---|---|---|
| **Principal: médicos de vuelo y equipos médicos de misión** | NASA, agencias espaciales y operadores comerciales (SpaceX, Axiom, Blue Origin) | Saber qué tripulante vigilar, qué sistema del cuerpo y hasta cuándo |
| **Tripulación y pasajeros comerciales** | Astronautas profesionales y **civiles sin entrenamiento de astronauta**, como los 4 de Inspiration4 | Entender su propio estado en segundos y saber qué hacer |
| **Investigadores en medicina espacial** | Científicos que usan NASA OSDR | Ver datos multisistema integrados, persona por persona |
| **En la Tierra (expansión)** | Operadores en entornos extremos: bases antárticas, submarinos, pilotos, conductores de largas distancias | Vigilar la fatiga y el estrés en cabina, y cambios sutiles en análisis de sangre |

### ❗ Problema

**Problema general.** Viajar al espacio pone en riesgo todo el cuerpo humano. La NASA identifica **5 peligros** del vuelo espacial (radiación, aislamiento, distancia a la Tierra, gravedad alterada y ambiente hostil), asociados a **más de 30 riesgos de salud**, entre ellos la alteración del sistema inmune. Las defensas se debilitan incluso en misiones cortas: **el 53 % de los astronautas de vuelos Shuttle y el 61 % de los de la ISS reactivaron virus latentes** como el herpes o el Epstein-Barr (Rooney et al., 2019). El descanso también se resiente: en órbita duermen **menos de 6 horas** por noche, frente a las **8,5 h** que programa la NASA, y **3 de cada 4** usan somníferos (Barger et al., 2014). Mientras tanto, cada vez vuela más gente: la FAA registra **1.360 personas** en vuelos tripulados de EE. UU., y se suman pasajeros civiles con menos preparación médica. Hoy no existe una herramienta que vigile **todo el cuerpo a la vez** ni el **cansancio de forma continua**. Es el mismo problema que en la Tierra, donde la somnolencia al volante causó **693 muertes** en EE. UU. en 2022 según la NHTSA, con una cifra real estimada en unas **10 veces mayor**.

**Problema específico.** Los datos oficiales de la NASA de la misión **Inspiration4** (NASA OSDR, OSD-569 y OSD-575) muestran que **solo 3 días en órbita** bastaron para alterar la sangre de sus **4 tripulantes civiles** sin que un análisis convencional lo detectara. Al día siguiente de aterrizar, comparando a cada persona consigo misma, la inflamación (**proteína C reactiva**) subió un **47,6 %** y la **glucosa** un **24,1 %** en los 4, mientras que los **leucocitos** bajaron un **14,5 %** y los **neutrófilos** un **13,4 %**, también en los 4. Los linfocitos cayeron hasta un **33,8 %**. Sin embargo, **solo 1 de 79** valores del hemograma salió del rango clínico normal, así que el laboratorio **no marcó nada**. Además, algunos efectos duraron más que la misión: los neutrófilos seguían un **18,8 % por debajo a los 194 días**. No hubo tormentas solares durante el vuelo (**0 eventos**, según NASA DONKI), y la misión **no tiene ningún dato público de sueño, fatiga o estrés**. Hay un patrón de riesgo real que nadie está viendo, y ASTRA existe para hacerlo visible.

#### Detalle de cifras: problema general

| Dato oficial | Cifra | Fuente |
|---|---|---|
| Peligros del vuelo espacial definidos por la NASA | **5**: radiación, aislamiento y confinamiento, distancia a la Tierra, gravedad alterada y ambiente hostil o cerrado | [NASA Human Research Program](https://www.nasa.gov/hrp/hazards) |
| Riesgos de salud asociados a esos peligros | **Más de 30** riesgos documentados por el HRP | [Revisión en PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7645687) |
| Sistema inmune: riesgo oficial de la NASA | *"Risk of … Adverse Health Events … due to Altered Immune Response"* (Immune Risk) | [NASA, página del riesgo inmune](https://www.nasa.gov/directorates/esdmd/hhp/risk-of-adverse-health-event-due-to-altered-immune-response/) |
| Virus latentes que se reactivan en vuelos **cortos** (Shuttle) | **53 %** de los astronautas (47 de 89) | [Rooney et al. 2019, *Frontiers in Microbiology*, estudio financiado por la NASA](https://www.frontiersin.org/articles/10.3389/fmicb.2019.00016/text) |
| Virus latentes que se reactivan en la **ISS** | **61 %** (14 de 23) | Ídem |
| Sueño en órbita | **< 6 h** por noche en el Shuttle y **~6 h** en la ISS, frente a **8,5 h** programadas por la NASA | [Barger et al. 2014, *The Lancet Neurology*](https://www.sciencedaily.com/releases/2014/08/140807215803.htm) (64 astronautas del Shuttle y 21 de la ISS) |
| Uso de somníferos | **~3 de cada 4** astronautas en algún momento del vuelo | Ídem |
| Personas en vuelos espaciales tripulados de EE. UU. | **1.360** (991 orbitales y 369 suborbitales), a dic. de 2025 | [FAA](https://www.faa.gov/media/77636) |
| Civiles privados que han volado | De **~20** a finales de 2022 a **más de 80** a finales de 2024 | [Space Daily](https://spacedaily.com/d-approximately-120-private-civilians-have-now-flown-to-space-aboard-commercial-rockets-roughly-one-sixth-of-all-the-human-beings-who-have-ever-left-earth-and-the-rate-at-which-citiz/) (estimación, no oficial) |

**En resumen:** la NASA reconoce más de 30 riesgos de salud. Más de la mitad de los astronautas reactivan virus incluso en vuelos cortos, duermen ~2,5 h menos de lo programado, y el número de civiles que vuelan se multiplica.

**En la Tierra (mismo problema de fatiga):** la NHTSA registra **693 muertes** en 2022 en choques con conductores somnolientos ([vía Bankrate](https://bankrate.com/insurance/car/drowsy-driving-statistics)), y la GHSA estima que la cifra real es **unas 10 veces mayor** ([GHSA, *Wake Up Call* 2026](https://www.ghsa.org/sites/default/files/2026-02/Wake_Up_Call_2026_Update.pdf)).

#### Detalle de cifras: problema específico

Datos **oficiales** de NASA OSDR ([OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) y [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)), analizados por ASTRA: 4 tripulantes civiles, 3 días en órbita (16–18 sep 2021), 7 controles de L-92 a R+194.

| Hallazgo (día 1 tras aterrizar vs. línea base personal) | Cifra | Tripulantes |
|---|---|---|
| Inflamación: proteína C reactiva | **+47,6 %** | **4 de 4** ⬆️ |
| Glucosa | **+24,1 %** | **4 de 4** ⬆️ |
| Leucocitos totales | **−14,5 %** | **4 de 4** ⬇️ |
| Neutrófilos | **−13,4 %**, y **−18,8 % a los 194 días** | **4 de 4** ⬇️ |
| Linfocitos | **−19,9 %** (hasta **−33,8 %** en C002) | 3 de 4 ⬇️ |
| Monocitos (%) | **+24,5 %** | **4 de 4** ⬆️ |
| Albúmina, calcio y bicarbonato | −3 % a −6 % | **4 de 4** ⬇️ |
| **Valores del hemograma fuera del rango clínico en R+1** | **solo 1 de 79** | — |
| Partículas solares y tormentas geomagnéticas durante la misión ([NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/)) | **0 y 0** | — |
| Datos públicos de sueño, fatiga o estrés de la tripulación | **ninguno** | — |

**El problema específico, en 3 puntos:**
1. **Patrón invisible:** las defensas bajan y la inflamación y la glucosa suben en **los 4 tripulantes**, pero casi todo sigue "en rango". **Un laboratorio estándar no marca nada.**
2. **Efectos que duran:** tras solo **3 días** en órbita, los neutrófilos siguen **−19 % a los 6 meses**.
3. **Punto ciego de fatiga:** los astronautas duermen ~6 h en órbita, pero esta misión **no tiene ninguna medición pública** de sueño, fatiga ni estrés.

> **Contexto oficial:** el atlas SOMA (*Nature*, junio de 2024), que reúne los datos de Inspiration4, concluye que la tripulación mostró muchos de los cambios de las misiones largas y que **la mayoría se recuperó rápido**. ASTRA muestra a la vez que **algunos marcadores, como los neutrófilos, no volvieron a su base**, y que la respuesta varía mucho de una persona a otra ([Weill Cornell](https://news.weill.cornell.edu/news/2024/06/commercial-astronauts-shed-light-on-flights%E2%80%99-health-impacts-and-create-spaceflight)).

### 💡 Solución

**ASTRA: un gemelo digital del cuerpo completo del astronauta.**

| Módulo | Qué hace | Datos |
|---|---|---|
| 🧍 **Escáner corporal** | Mapa del cuerpo con 8 sistemas en semáforo y línea de tiempo L-92 → R+194 | NASA OSDR **OSD-569 + OSD-575** (reales) |
| 🧠 **Riesgo ASTRA 0–100** | Compara a cada persona **consigo misma**, contra la variación habitual de cada marcador | Derivado |
| 💬 **Alertas + Copilot** | Dicen qué cambió, desde cuándo, la posible causa, la acción y la fuente | Derivado |
| ☀️ **Clima espacial** | Fulguraciones, CME, partículas solares y tormentas durante la misión | **NASA DONKI** (real) |
| 👁️ **ASTRA Vision** | Fatiga, estrés y distracción con la cámara: **MediaPipe** (PERCLOS, parpadeo, bostezos, cabeceos, tensión facial) + **YOLO11s** en **FastAPI** | En el dispositivo |
| 🟣 **Simulador** | Tormenta solar, misión larga, falta de sueño | Simulado (etiquetado) |
| ➕ **Nuevos tripulantes** | Registra a cualquier persona (perfil + análisis o CSV) y calcula su riesgo con su propia línea base | Datos del usuario |
| 🌙 **Bienestar y sueño** | Registro diario de sueño, ánimo, estrés y carga + datos de wearable; alertas ligadas a los riesgos NASA HRP | Usuario / wearable |
| 📡 **Fisiología y radiación** | Misión de 30 días impulsada por eventos solares **reales**: dosis, Curiosity RAD, signos vitales, análogo OSD-681, evidencia NTRS y contexto orbital EPIC | **DONKI, PDS, OSDR, NTRS, EPIC** (reales) + vitales sintéticos |
| 🗂️ **Datos y recursos** | Las 7 fuentes NASA con su enlace y descarga CSV, exportación de los datos propios, glosario y límites | Real |
| 💻 **App sin conexión** | Instalador de Windows con base de datos SQLite local que se sincroniza sola al volver la red | Local + servidor |

> El detalle de **cada funcionalidad**, pantalla por pantalla, está en la **sección 3**.

#### La solución en 3 fases: antes, durante y después de la misión

ASTRA acompaña al tripulante **en todo el ciclo de la misión**. **Antes del vuelo** (L-92, L-44, L-3), el **Escáner corporal** y el **Riesgo ASTRA** construyen la **línea base personal** de cada persona con sus análisis de sangre, y **ASTRA Vision** calibra su rostro en reposo. El **Simulador** permite ensayar escenarios (tormenta solar, misión larga, poco sueño) para planificar, y el **Copilot** explica a cada tripulante su punto de partida. En Inspiration4, ASTRA detectó aquí un primer hallazgo: el control L-3 ya salía elevado, una posible señal de **estrés previo al lanzamiento**. **Durante el vuelo**, **ASTRA Vision** vigila de forma continua la **fatiga, el estrés y la distracción** en cabina (PERCLOS, parpadeos, bostezos, cabeceos y el modelo YOLO11s), el módulo de **Clima espacial** sigue en tiempo real los eventos solares de **NASA DONKI** y las **Alertas** avisan en el momento con una acción concreta. **Después del aterrizaje** (R+1 a R+194), el **Escáner corporal** compara cada análisis con la línea base y muestra qué sistemas se alteraron, el **Riesgo ASTRA** indica **cuándo se recupera cada sistema**, la vista de **Tripulación completa** compara a los 4 tripulantes y las **Alertas** y el **Copilot** dicen al médico qué vigilar y hasta cuándo. Con Inspiration4, por ejemplo, ASTRA muestra que los linfocitos se recuperan en ~45 días y que los neutrófilos siguen bajos a los 194 días.

| Módulo | 🟦 Antes (L-92 → L-3) | 🟧 Durante (vuelo) | 🟩 Después (R+1 → R+194) |
|---|---|---|---|
| 🧍 Escáner corporal | ✅ Construye la línea base | — (sin análisis en vuelo) | ✅ Compara con la base |
| 🧠 Riesgo ASTRA | ✅ Punto de partida (detecta estrés en L-3) | — | ✅ Riesgo y ventana de recuperación |
| 👁️ ASTRA Vision | ✅ Calibración del rostro en reposo | ✅ **Fatiga, estrés y distracción en tiempo real** | ✅ Seguimiento del descanso |
| ☀️ Clima espacial (DONKI) | ✅ Pronóstico antes del lanzamiento | ✅ **Eventos solares en vivo** | ✅ Descarta la radiación como causa |
| 🚨 Alertas | — | ✅ Alerta inmediata con acción | ✅ Qué vigilar y hasta cuándo |
| 💬 Copilot | ✅ Explica su punto de partida | ✅ "¿Estoy cansado?" | ✅ "¿Cuándo me recupero?" |
| 👥 Tripulación completa | ✅ Compara bases | ✅ Estado de todos | ✅ Quién se recupera peor |
| 🟣 Simulador | ✅ **Planificar escenarios** | ✅ "¿Qué pasa si llega una tormenta?" | — |

*Nota: Inspiration4 no tiene análisis de sangre tomados en vuelo, así que en esa fase ASTRA usa Vision, DONKI y el Simulador.*

### ⭐ Diferencia

| Lo que existe hoy | ASTRA |
|---|---|
| Análisis aislados por especialidad | **Cuerpo completo integrado:** 8 sistemas en un solo gemelo digital |
| Rangos de laboratorio para la población general | **Línea base personal + ruido de cada marcador:** detecta cambios que el laboratorio no marca |
| Datos médicos **o** datos ambientales | **Fisiología + clima espacial (DONKI)** en la misma línea de tiempo |
| Paneles de números | **Alertas explicadas** y un **Copilot** que responde con la fuente citada |
| Fatiga autoevaluada en cuestionarios | **Visión por computadora continua** con 2 modelos (MediaPipe + YOLO11s) |
| Demos con datos inventados | **Datos 100 % reales** de NASA OSDR en el núcleo; cada dato etiquetado **REAL / DERIVADO / SIMULADO**, y errores de los datos detectados y documentados |
| Herramientas para expertos | Se entiende en segundos: **resumen en una frase**, semáforo y lenguaje simple |

> **En una frase:** ASTRA **une los análisis de sangre reales de la NASA, el clima espacial y la visión por computadora en un gemelo digital del cuerpo completo**, y detecta en **4 de 4 tripulantes** un patrón de estrés que el laboratorio convencional no ve.

### 🌎 Impacto: del espacio a la minería y a Ayacucho

Un astronauta y un minero de altura enfrentan riesgos muy parecidos: **turnos largos y confinados, aislamiento, falta de sueño, un ambiente hostil y fatiga al operar equipos críticos**. Por eso ASTRA puede llevarse casi sin cambios a la **minería**, y en especial a regiones andinas como **Ayacucho**. La minería es el corazón económico de esa región: su principal mineral es el **oro** ([BCRP](https://www.bcrp.gob.pe/docs/Sucursales/Huancayo/2024/sintesis-ayacucho-04-2024.pdf)), y se estima que trabajan allí unos **15.000 mineros informales**, sobre todo en **Lucanas y Parinacochas** ([ProActivo](https://proactivo.com.pe/ayacucho-tiene-15000-mineros-informales-y-aumentarian-si-sale-la-mineria-formal/)), casi siempre sin vigilancia médica continua. En el Perú, los accidentes mortales en minería bajaron de **58 en 2008 a 25 en 2025** según Osinergmin ([Forbes Perú](https://forbes.pe/negocios/2026-05-13/por-que-la-seguridad-es-un-elemento-clave-en-la-competitividad-de-la-mineria-peruana/)), pero **cada muerte sigue siendo evitable**, y la fatiga es un factor reconocido: un estudio de la Universidad de Chile atribuye directamente a la **fatiga y la somnolencia el 3,9 % de 1.110 accidentes** analizados y el **4,6 % de los accidentes fatales** de la minería chilena entre 2000 y 2016 ([Repositorio U. de Chile](https://repositorio.uchile.cl/handle/2250/147471)). ASTRA Vision detectaría la somnolencia de un operador de camión minero **antes** del accidente. El Escáner corporal convertiría los **exámenes médicos ocupacionales** que ya se hacen en una **línea base personal** capaz de ver cambios "dentro de rango". Y el módulo de ambiente cambiaría el clima espacial por **altitud, temperatura y turno**.

| ASTRA en el espacio | ASTRA en la minería (Ayacucho) |
|---|---|
| Astronauta antes, durante y después de la misión | Minero **antes, durante y después del turno** (por ejemplo, regímenes 14×7) |
| Análisis de sangre NASA OSDR | **Exámenes médicos ocupacionales** periódicos |
| ASTRA Vision en la cabina de la nave | ASTRA Vision en la **cabina del camión minero o de la maquinaria** |
| Clima espacial (DONKI) | **Altitud, frío, horario y horas acumuladas de turno** |
| Médico de vuelo | **Médico ocupacional y supervisor de seguridad** |
| Alerta: "repetir electrolitos, vigilar infección" | Alerta: **"pausa de 15 min, cambio de operador"** |

**Otras áreas donde ASTRA tiene impacto:**
- 🚌 **Transporte interprovincial en los Andes** (rutas como Ayacucho–Lima): fatiga del conductor.
- 🏥 **Hospitales:** turnos nocturnos del personal de salud.
- ✈️ **Aviación y pilotos.**
- 🧊 **Bases en la Antártida** (como la estación peruana Machu Picchu), petroleras y submarinos: los mismos análogos que la NASA usa para estudiar el aislamiento.
- 🏔️ **Poblaciones de altura**, con vigilancia de salud comparando a cada persona consigo misma.

> **Impacto en una frase:** la tecnología que protege a un astronauta en órbita puede proteger mañana a un minero de Ayacucho en su turno de noche.

---

## 1. El problema

En el espacio el cuerpo cambia **en todos sus sistemas a la vez**: defensas, inflamación, corazón, metabolismo, riñón, piel y microbioma. Hoy esos datos se analizan **por separado** y con rangos de laboratorio pensados para la población general. Así se pierden dos cosas:

1. **Cambios dentro del rango normal** que para *esa persona* sí son anormales.
2. **Señales pequeñas en varios sistemas** que, juntas, indican un riesgo real.

Con el turismo espacial, pasajeros sin entrenamiento de astronauta profesional viajan a órbita. **Ningún sistema les ofrece hoy una vista integrada de todo el cuerpo.**

> **Ejemplo real (Inspiration4, día 1 post-vuelo):** la **proteína C reactiva (inflamación) sube en los 4 tripulantes**, la **glucosa sube en los 4**, los **neutrófilos bajan en los 4** y la **albúmina baja en los 4**. Casi todos los valores siguen "en rango", así que un laboratorio no marca nada. Juntos, dibujan una respuesta de estrés sistémico.

## 2. La solución: los 3 componentes de ASTRA

| Componente | Qué hace |
|---|---|
| 🩺 **ASTRA Monitor** | Monitoreo de cada sistema del cuerpo frente a la **línea base personal** + clima espacial (DONKI) |
| 🧍 **ASTRA Twin** | **Gemelo digital**: mapa del cuerpo con cada sistema coloreado según su estado, línea de tiempo (antes, en vuelo, después) y simulador de escenarios |
| 🧠 **ASTRA Intelligence** | Detección de anomalías, **Health Risk Score** multisistema y **Copilot**, un asistente que responde preguntas usando solo los datos del tripulante |

### Principio de credibilidad

Cada dato lleva una etiqueta visible:
- 🟦 **REAL:** medido en la tripulación (NASA OSDR) o en el espacio (DONKI).
- 🟪 **DERIVADO:** calculado a partir de datos reales (cambios porcentuales, scores).
- 🟧 **SIMULADO:** solo en el simulador de escenarios y en los sistemas sin datos públicos. Nunca se mezcla con lo real.

## 3. Funcionalidades del sistema ASTRA Health

Esta sección describe **todo lo que hace hoy el sistema**, pantalla por pantalla, tal como está implementado. Sirve como guía para la exposición y la demo.

### 3.1 Mapa del sistema

| Ruta | Módulo | Vistas o secciones | Para qué sirve |
|---|---|---|---|
| `/` | **Landing** | Problema · Gemelo · Solución por fases · Módulos · Vision · Impacto · Datos · Descarga | Presentar ASTRA y entrar al sistema o descargar la app |
| `/system` | 🏥 **Bahía médica** | Resumen · Alertas y Copilot · Tripulación · Fatiga y estrés · Simulador | Estado de cada tripulante frente a su propia línea base |
| `/system#add-crew` | ➕ **Nuevo tripulante** | Asistente de 3 pasos | Añadir a cualquier persona con sus análisis |
| `/system/wellbeing` | 🌙 **Bienestar y sueño** | Registro de hoy · Tendencias · Wearable | Salud conductual, sueño y recuperación día a día |
| `/system/monitor` | 📡 **Fisiología y radiación** | Clima espacial · Radiación · Signos vitales · Análogo de microgravedad · Alertas · Evidencia NASA · Contexto orbital | Cruzar eventos solares reales con dosis y signos vitales |
| `/system/resources` | 🗂️ **Datos y recursos** | Conjuntos NASA · Tus datos · Marco HRP/CSA · Glosario · Límites | Transparencia: qué datos se usan, de dónde salen y descarga |
| `/system/settings` | ⚙️ **Ajustes** | Apariencia · Monitoreo · Conexión y sincronización · Datos y privacidad · Acerca de | Preferencias del equipo y conexión con el sistema online |

La barra lateral muestra los módulos y, debajo, las vistas del módulo actual. En pantallas pequeñas se convierte en un menú desplegable. La barra superior muestra el **estado de sincronización**, el cambio de **idioma (ES/EN)** y el de **tema (claro/oscuro)**.

### 3.2 Landing (página de inicio)

- **Hero con el gemelo de rayos X:** una figura del cuerpo con una "lente" que revela los sistemas internos.
- **Problema y cifras clave** con fuente citada.
- **Solución en 3 fases** con pestañas **Antes · Durante · Después** del vuelo; cada fase lista los módulos que usa.
- **Módulos, ASTRA Vision, Impacto** (espacio → minería en Ayacucho) y **Datos** (fuentes NASA).
- **Llamada a la acción:** "Entrar al sistema" y **"Descargar para Windows"** (`/downloads/ASTRA-Health-Setup.exe`, ~126 MB).

### 3.3 Bahía médica (`/system`)

Todas las vistas comparten una misma selección: **tripulante**, **momento de la misión** y **sistema del cuerpo**.

**Elementos comunes**
- **Selector de tripulante:** los 4 de Inspiration4 (C001–C004) más los añadidos por el usuario, con su etiqueta de línea base (personal o provisional).
- **Línea de tiempo de la misión** en lenguaje simple: 3 meses, 6 semanas y 3 días antes; 1 día, 6 semanas, 3 y 6 meses después (L-92 … R+194), con la franja del vuelo marcada.

**Vista 1 · Resumen**
- **Resumen en una frase** del estado del tripulante en el momento elegido.
- **Escáner corporal:** imagen anatómica con 8 puntos (cerebro, defensas, corazón, hígado, metabolismo, riñón, sangre, inflamación) coloreados en semáforo 🟢🟡🟠🔴; al hacer clic se elige el sistema.
- **Panel de estado:** anillo con el **Riesgo ASTRA 0–100**, lista de los 7 sistemas con datos y su puntuación, y los **marcadores del sistema elegido** con valor, unidad, rango clínico y % frente a la línea base. Los sistemas sin datos públicos (cerebro y ojos, sueño y estrés, ritmo cardiaco) aparecen como "sin datos".
- **Leyenda** plegable con los niveles y las etiquetas REAL / DERIVADO / SIMULADO.

**Vista 2 · Alertas y Copilot**
- **Alertas explicadas:** cada señal dice qué marcador cambió, cuánto, desde cuándo (persistencia en controles seguidos), la **acción sugerida** por sistema y la **fuente** (OSD-569 / OSD-575).
- **ASTRA Copilot:** 6 preguntas sugeridas (*¿Por qué empeoró mi estado? · ¿Qué está fuera de mi rango? · ¿Cuándo me recupero? · ¿Hubo radiación en la misión? · ¿Cómo estoy frente a la tripulación? · ¿Estoy cansado?*) y texto libre. Reconoce sistemas por palabra clave ("riñón", "glucosa", "defensas"…), responde **solo con los datos del tripulante**, cita la fuente y dice con honestidad cuando **no hay datos reales** (sueño, ritmo cardiaco, cerebro). Si ASTRA Vision está activo, "¿Estoy cansado?" responde con la fatiga y el estrés medidos en ese momento.

**Vista 3 · Tripulación**
- **Mapa de calor de la tripulación:** filas = tripulantes, columnas = sistemas, celda = puntuación 0–100. Un clic abre a esa persona y ese sistema.
- **Clima espacial de la misión (NASA DONKI, sep 2021):** 9 fulguraciones, 51 CME, 0 SEP y 0 tormentas geomagnéticas, con la franja del vuelo. Demuestra que la radiación solar **no explica** los cambios.

**Vista 4 · Fatiga y estrés (ASTRA Vision)**
- **3 modos:** cámara en vivo, analizar un **video subido** y **demo simulada** de un turno (atento → cansado → estresado).
- **Calibración de 8 s** del rostro en reposo y medidores de **fatiga**, **estrés** y **distracción** (0–100), más las métricas faciales: PERCLOS, parpadeos/min, duración del parpadeo, bostezos, cabeceos, tensión e inquietud.
- **Explicación en lenguaje simple** de por qué sube cada indicador (por ejemplo, "ojos cerrados el 18 % del último minuto; umbral 15 %").
- **Segundo modelo YOLO11s** (si el backend está activo): estado de conducta (atento, somnolencia, bostezo, distraído, bebiendo, conducta peligrosa), confianza y caja sobre el rostro. Sin backend, sigue funcionando solo con MediaPipe.
- **Historial de sesiones:** cada sesión se guarda (tripulante, duración, fatiga y estrés máximos y medios) en la base local, con su estado de sincronización; se puede filtrar por tripulante y borrar.
- **Privacidad:** el video se analiza en el equipo y **nunca se envía ni se guarda**.

**Vista 5 · Simulador de escenarios** 🟧
- Controles: **duración de la misión** (días), **horas de sueño** y **tormenta solar** (ninguna, S1 a S4).
- Parte de la **respuesta real media de la tripulación en R+1** y la proyecta con reglas ilustrativas: puntuación por sistema, radiación, riesgo global, frecuencia cardiaca estimada, dosis y sueño acumulado.
- Siempre marcado **"SIMULADO · NO SON DATOS REALES"** y en color violeta.

### 3.4 Nuevos tripulantes (asistente de 3 pasos)

1. **Perfil:** nombre o código, sexo, edad, rol (comandante, piloto, especialista, oficial médico), misión y notas.
2. **Análisis de sangre:** se marcan los controles disponibles y se cargan los **33 marcadores** agrupados por sistema, con unidad y rango normal. Validación en vivo (naranja = fuera de rango, rojo = valor inválido). Alternativas: **Importar CSV**, **Plantilla** y **Ejemplo** simulado.
3. **Revisión:** resumen, marcadores fuera de rango, tipo de línea base y **riesgo ASTRA estimado en cada control** antes de guardar.

- **Línea base personal** si tiene 2 o más controles previos; si no, **provisional** (promedio de Inspiration4, arranque en frío).
- Cada tripulante se puede **editar** o **quitar**, y se sincroniza con el sistema online.
- Demuestra que ASTRA **no depende de Inspiration4**: sirve para cualquier astronauta, minero o piloto. Detalle en `docs/NUEVOS_TRIPULANTES.md`.

### 3.5 Bienestar y sueño (`/system/wellbeing`)

Cubre el peligro **aislamiento y confinamiento**, lo que los análisis de sangre no ven.

| Vista | Qué hace |
|---|---|
| **Registro de hoy** | Formulario de menos de 1 minuto: horas y calidad del sueño, ánimo, estrés, cansancio, carga de trabajo, conexión con los demás (1–5), 8 síntomas (dolor de cabeza, congestión, visión, espalda, náuseas, insomnio, desmotivación, conflicto) y una nota. Uno por día, corregible. Recordatorio opcional si aún no hay registro |
| **Tendencias** | Gráficos día a día frente a la **línea base personal** (mediana de los primeros 7 días) y **riesgo de bienestar 0–100** |
| **Wearable** | Importa un CSV diario (pulso en reposo, HRV RMSSD, sueño, SpO₂, minutos activos, temperatura de la piel), con plantilla descargable y un **ejemplo simulado** de 16 días |

**7 alertas, cada una ligada a un riesgo NASA HRP:** pérdida de sueño (2 de 3 noches < 6 h) · ánimo bajo o aislamiento · estrés con carga alta · recuperación baja (HRV −20 %, crítica si además el pulso sube > 10 %) · oxígeno bajo (SpO₂ < 94 %) · cambios en la visión (SANS) · dolor de cabeza con congestión (CO₂ de cabina). Cada alerta dice **qué pasa, qué hacer y a qué riesgo se refiere**. Detalle en `docs/BIENESTAR.md`.

### 3.6 Fisiología y radiación (`/system/monitor`)

Una misión de **30 días (1–30 ene 2026)** impulsada por los **eventos solares reales** de NASA DONKI.

| Sección | Contenido | Tipo |
|---|---|---|
| **Indicadores** | 9 eventos de partículas solares · 285 CME (con la más rápida) · Kp máximo · dosis en tejido de Curiosity · dosis acumulada · alertas críticas | Real / derivado |
| **Clima espacial** | Velocidad de las CME y el índice Kp (ene–feb 2026), con los SEP marcados; lista de SEP con enlace a DONKI | 🟦 REAL |
| **Radiación** | Tasa de dosis real de **Curiosity RAD** en Marte (436 lecturas, µGy/h) y el modelo de dosis diaria y acumulada del astronauta (base ~0,35 mGy/día + picos en días de SEP y tormentas) | 🟦 REAL + 🟪 DERIVADO |
| **Signos vitales · ASTR-1** | Frecuencia cardiaca, HRV, sueño y estrés de un astronauta **sintético** calibrado con literatura NASA, con las ventanas de SEP en rojo y la línea base personal | 🟧 SINTÉTICO |
| **Análogo de microgravedad** | **OSDR OSD-681:** presión intracraneal y temperatura de 33 animales en inclinación cabeza abajo durante 180 días (media y rango) | 🟦 REAL |
| **Alertas explicadas** | Z robusto (mediana/MAD de los días 1–10); alerta **alta** si 2 señales cruzan su umbral el mismo día y **crítica** si son 3. Resultado: **6 alertas críticas (días 18–23)** tras el SEP real del 18 de enero | 🟪 DERIVADO |
| **Evidencia NASA** | **37 informes técnicos de NASA NTRS** que respaldan cada umbral (frecuencia cardiaca, HRV, sueño, radiación, presión intracraneal) | 🟦 REAL |
| **Contexto orbital** | Última imagen real de la Tierra de **NASA EPIC** (DSCOVR, L1) e imágenes oficiales de la **NASA Image Library** por tipo de alerta | 🟦 REAL |

Los datos se generan con el pipeline de Python (`backend/pipeline/run_all.py`) y se exportan al frontend (`export_frontend.py` → `frontend/data/monitor.json`, también en `GET /api/monitor`).

### 3.7 Datos y recursos (`/system/resources`)

- **7 conjuntos de datos NASA** (OSD-569, OSD-575, DONKI 2021, DONKI 2026, Curiosity RAD, OSD-681, NTRS): qué son, cuántos registros, periodo, en qué módulo se usan, **"Ver fuente"** y **"Descargar CSV"**.
- Contadores: conjuntos NASA, registros reales, 4 tripulantes reales y 33 marcadores de laboratorio.
- **Tus datos:** exporta en CSV los tripulantes añadidos, las sesiones de monitoreo y los registros de bienestar.
- **Marco oficial del reto (NASA HRP y CSA):** cómo ASTRA aplica cada recurso oficial (5 peligros, riesgos HRP, investigación HRP, monitoreo de radiación de la CSA).
- **Glosario** de términos y **límites y cómo citar**.

### 3.8 Ajustes (`/system/settings`)

- **Apariencia:** idioma (español / inglés), tema (claro / oscuro) y tamaño del texto (normal / grande, para leer con poca luz o en movimiento).
- **Monitoreo:** recordatorio del registro diario y aviso de que la cámara se procesa **en el dispositivo**.
- **Conexión y sincronización:** estado, cambios pendientes, dirección del servidor (en la app de escritorio), **token de acceso** y "Sincronizar ahora".
- **Datos y privacidad, Acerca de** (versión y aviso de actualización) y **Salir** (cierra la app de escritorio o vuelve al landing en la web).

### 3.9 Funciona sin internet: app de escritorio y sincronización

Responde al peligro **distancia a la Tierra**: en una nave, una mina o una base antártica la conexión no está garantizada.

| | Web (online) | App de escritorio (Windows) |
|---|---|---|
| Internet | Necesaria | **No necesaria** |
| Datos locales | Navegador | **SQLite** en `%APPDATA%\ASTRA Health\astra.db` |
| Sincronización | Con el servidor | Sube y baja cambios al volver la red |

- **Instalador** (Electron + electron-builder, NSIS) sin permisos de administrador, con accesos directos.
- **Sincronización automática:** al abrir, al volver la conexión, 3 s después de cada cambio y cada minuto. Regla **"gana la escritura más reciente"**, borrados como "lápidas", cursor por dispositivo y nada se pierde si el servidor no responde.
- **Aviso de actualización** consultando `GET /api/app/version`.
- **Seguridad:** la interfaz no accede a Node.js (puente limitado a 7 operaciones), cámara solo para la app, token opcional `ASTRA_SYNC_TOKEN`. Detalle en `docs/OFFLINE_ONLINE.md`.

### 3.10 Experiencia de uso y credibilidad

- **Bilingüe** (español / inglés) en todo el sistema, **tema claro y oscuro** y **diseño adaptable** a móvil.
- **Semáforo único** en todo el sistema: normal · vigilar · alerta · crítico.
- **Etiqueta visible en cada dato:** 🟦 REAL · 🟪 DERIVADO · 🟧 SIMULADO / SINTÉTICO.
- **Avisos permanentes:** "señal de riesgo, no diagnóstico médico" e "indicador experimental".
- **Calidad de datos documentada:** muestra C003 / L-92 excluida, haptoglobina fuera del score (ver sección 9).

### 3.11 Cobertura de los 5 peligros del vuelo espacial (NASA HRP)

| Peligro NASA HRP | Cómo lo cubre ASTRA | Módulo |
|---|---|---|
| ☢️ **Radiación** | Eventos solares DONKI, dosis Curiosity RAD, modelo de dosis, simulador de tormentas | Fisiología y radiación · Tripulación · Simulador |
| 🧠 **Aislamiento y confinamiento** | Sueño, ánimo, estrés, carga y conexión social; fatiga y estrés con la cámara | Bienestar y sueño · ASTRA Vision |
| 🌍 **Distancia a la Tierra** | Funciona sin conexión, análisis en el equipo y sincronización diferida; Copilot que explica sin un médico al lado | App de escritorio · Copilot |
| 🪶 **Gravedad alterada** | Sangre, defensas, corazón, riñón, hígado y metabolismo (OSDR); análogo de microgravedad OSD-681 | Bahía médica · Fisiología y radiación |
| 🏭 **Ambiente hostil y cerrado** | Alertas de SpO₂ bajo y de dolor de cabeza con congestión (CO₂ de cabina) | Bienestar y sueño |

### 3.12 Guion de demo para la exposición (≈ 5 minutos)

1. **Landing (30 s):** el problema en una cifra (4 de 4 tripulantes, solo 1 de 79 valores fuera de rango) y las 3 fases.
2. **Bahía médica · Resumen (60 s):** elegir **C003** en **R+1**: el escáner se enciende en defensas y metabolismo; el riesgo sube a ~60. Mover la línea de tiempo hasta R+194: los neutrófilos siguen bajos.
3. **Alertas y Copilot (45 s):** leer una alerta (qué, cuánto, acción, fuente) y preguntar *"¿Hubo radiación en la misión?"* → 0 SEP, 0 tormentas.
4. **Tripulación (20 s):** mapa de calor: la respuesta es distinta en cada persona.
5. **Fatiga y estrés (45 s):** demo simulada o cámara en vivo: PERCLOS, bostezos y la alerta de fatiga; la sesión queda guardada.
6. **Fisiología y radiación (40 s):** el SEP real del 18 de enero dispara la dosis, el pulso sube, el sueño baja → 6 alertas críticas respaldadas por NTRS.
7. **Bienestar y sueño (30 s):** "Cargar ejemplo simulado" → 5 alertas ligadas a riesgos HRP.
8. **Nuevo tripulante + offline (30 s):** añadir una persona con el ejemplo, ver su riesgo estimado; mostrar "Sin conexión · modo local" en la app de escritorio.
9. **Cierre (20 s):** impacto en la minería de Ayacucho.

## 4. Mapa del cuerpo completo y fuentes NASA

| Sistema | Qué se monitorea | Fuente NASA | Tipo |
|---|---|---|---|
| 🩸 **Sangre y defensas** | Leucocitos, linfocitos, neutrófilos, monocitos, hemoglobina | **OSD-569** (hemograma) | 🟦 REAL |
| 🧬 **Genes de la sangre** | Expresión génica, m6A, hematopoyesis clonal (9 genes) | **OSD-569** | 🟦 REAL |
| 🔥 **Inflamación** | PCR, fibrinógeno, haptoglobina, AGP | **OSD-575** (panel cardiovascular) | 🟦 REAL |
| ❤️ **Corazón y vasos** | PF4, L-selectina, α-2 macroglobulina, SAP + citocinas cardiacas | **OSD-575** | 🟦 REAL |
| ❤️ **Ritmo cardiaco / HRV** | Frecuencia cardiaca, variabilidad | No hay datos públicos de la tripulación | 🟧 SIMULADO |
| 🫘 **Riñón** | Creatinina, BUN, eGFR, sodio, potasio | **OSD-575** (panel metabólico) | 🟦 REAL |
| 🟤 **Hígado** | AST, ALT, bilirrubina, fosfatasa alcalina, albúmina | **OSD-575** | 🟦 REAL |
| ⚡ **Metabolismo** | Glucosa, CO₂, calcio, proteínas | **OSD-575** | 🟦 REAL |
| 🦴 **Hueso** | Calcio, fosfatasa alcalina (indicadores indirectos) | **OSD-575** | 🟪 DERIVADO |
| 🛡️ **Células inmunes** | snRNA-seq, repertorio de linfocitos T y B | **OSD-570** | 🟦 REAL (fase 2) |
| 🧪 **Plasma** | Proteómica, metabolómica, ADN y ARN libres | **OSD-571** | 🟦 REAL (fase 2) |
| 🧴 **Piel** | Transcriptómica espacial, microbioma | **OSD-574** | 🟦 REAL (fase 2) |
| 🦠 **Microbioma** | Boca, nariz, piel, heces | **OSD-572, OSD-630** | 🟦 REAL (fase 2) |
| 🚽 **Orina** | Panel de inflamación | **OSD-656** | 🟦 REAL (fase 2) |
| 😴 **Sueño y estrés** | Horas de sueño, estrés | No hay datos públicos de la tripulación | 🟧 SIMULADO |
| ☀️ **Radiación ambiental** | Fulguraciones, CME, SEP, tormentas geomagnéticas | **NASA DONKI** | 🟦 REAL |
| 🔴 **Radiación de espacio profundo** | Dosis diaria de referencia | **Curiosity RAD (PDS)** | 🟦 REAL (solo referencia, Marte) |
| 👁️🧠 **Ojos y cerebro** | — | Sin datos públicos de la tripulación | 💡 Futuro |

**Todos los datos 🟦 REAL de sangre provienen de los mismos 4 tripulantes, en los mismos 7 puntos de tiempo:** L-92, L-44, L-3 (antes) · R+1, R+45, R+82, R+194 (después).

## 5. Datos en cifras

| Dato | Valor |
|---|---|
| Misión | SpaceX Inspiration4: **3 días** en órbita (16–18 sep 2021) |
| Tripulantes | **4** civiles (C001–C004), hombres y mujeres |
| Estudios OSDR de la misma tripulación | **10** (OSD-569, 570, 571, 572, 573, 574, 575, 630, 656, 687) |
| Usados en el MVP | **OSD-569** + **OSD-575** + **DONKI** |
| Hemograma | 20 analitos · **534** mediciones válidas |
| Panel metabólico | 19 analitos (riñón, hígado, metabolismo) |
| Panel cardiovascular | 9 marcadores · 252 mediciones |
| Eventos DONKI (sep 2021) | 9 fulguraciones · 51 CME · 0 SEP · 0 tormentas geomagnéticas |

## 6. Resultados reales: el cuerpo completo tras 3 días en órbita

Cambio promedio en **R+1** (día 1 después de aterrizar) respecto a la línea base personal (media de L-92, L-44 y L-3).

### 6.1 Lo que cambia en los 4 tripulantes

| Sistema | Marcador | R+1 | Tripulantes | Lectura |
|---|---|---|---|---|
| 🔥 Inflamación | **Proteína C reactiva (PCR)** | **+47,6 %** | ⬆️ **4 de 4** | Inflamación aguda post-vuelo |
| ⚡ Metabolismo | **Glucosa** | **+24,1 %** | ⬆️ **4 de 4** | Respuesta de estrés (cortisol) |
| 🩸 Defensas | **Monocitos (%)** | **+24,5 %** | ⬆️ **4 de 4** | Cambio de composición inmune |
| 🩸 Defensas | **Leucocitos totales** | **−14,5 %** | ⬇️ **4 de 4** | Defensas bajas |
| 🩸 Defensas | **Neutrófilos absolutos** | **−13,4 %** | ⬇️ **4 de 4** | Siguen −19 % a los 6 meses |
| 🟤 Hígado | **Albúmina** | −3,3 % | ⬇️ **4 de 4** | Cambio de fluidos y proteínas |
| ⚡ Metabolismo | **Calcio** | −3,1 % | ⬇️ **4 de 4** | A vigilar en relación con el hueso |
| ⚡ Metabolismo | **CO₂ (bicarbonato)** | −5,7 % | ⬇️ **4 de 4** | Equilibrio ácido-base |

### 6.2 Otros cambios relevantes

| Sistema | Marcador | R+1 | R+45 | R+82 | R+194 |
|---|---|---|---|---|---|
| 🩸 Defensas | Linfocitos absolutos | **−19,9 %** (3 de 4) | +0,3 % | +0,6 % | +0,5 % |
| 🔥 Inflamación | Fibrinógeno | −19,9 % | −16,6 % | −18,1 % | −2,6 % |
| ❤️ Corazón y vasos | PF4 (activación de plaquetas) | +17,1 % (3 de 4) | +26,4 % | +79,8 % | +52,0 % |
| ❤️ Corazón y vasos | α-2 macroglobulina | +13,4 % (3 de 4) | +26,1 % | +70,2 % | +40,5 % |
| 🫘 Riñón | BUN (urea) | +10,9 % (3 de 4) | −2,9 % | −0,9 % | +29,2 % |
| 🟤 Hígado | Bilirrubina | +0,4 % | **+56,3 %** | +47,0 % | −13,4 % |
| ❤️ Glóbulos rojos | Hemoglobina | −1,6 % | +0,3 % | +0,3 % | −1,8 % |

### 6.3 Defensas por tripulante (linfocitos y neutrófilos en R+1)

| Tripulante | Linfocitos | Neutrófilos | Leucocitos | Valores fuera de rango en R+1 | Lectura |
|---|---|---|---|---|---|
| C001 | 🟠 −27,3 % | 🟢 −9,7 % | 🟡 −16,2 % | — | Defensas bajas |
| C002 | 🟠 **−33,8 %** | 🟢 −2,9 % | 🟡 −13,6 % | — | Mayor caída de linfocitos |
| C003 | 🟠 −20,4 % | 🟠 **−33,0 %** | 🟠 **−26,7 %** | 🔴 Glucosa 103 · 🔴 **Potasio 3,0** | **Mayor riesgo multisistema** |
| C004 | 🟢 +1,9 % | 🟢 −8,1 % | 🟢 −1,6 % | 🔴 BUN 26 · 🔴 AST 48 | Defensas estables; riñón e hígado a vigilar |

### 6.4 Lo que significa

1. 🧍 **El cuerpo responde como un sistema:** inflamación ⬆️, glucosa ⬆️, defensas ⬇️ y albúmina y calcio ⬇️ en **los 4 tripulantes**. Ningún análisis aislado lo muestra; **ASTRA sí**.
2. ⏱️ **Ventanas de recuperación distintas por sistema:** los linfocitos se recuperan en ~45 días, pero los neutrófilos siguen bajos a los 6 meses y los marcadores vasculares (PF4, α-2 macroglobulina) **siguen subiendo** hasta R+82.
3. 👤 **La respuesta es muy individual:** C003 suma defensas bajas, glucosa alta y potasio bajo. C004 casi no cambia en defensas, pero tiene riñón e hígado fuera de rango. **Por eso cada persona se compara consigo misma.**
4. ☀️ **La radiación solar no lo explica:** durante la misión hubo **0 eventos de partículas solares y 0 tormentas geomagnéticas** (DONKI). La causa más probable es el estrés del vuelo, la microgravedad y la readaptación a la gravedad.

## 7. ASTRA Twin: el gemelo digital

```
           🧠 Ojos y cerebro  [💡 sin datos]
               │
   🔥 Inflamación ── ❤️ Corazón ── 🩸 Sangre y defensas
               │
   🟤 Hígado ── ⚡ Metabolismo ── 🫘 Riñón
               │
   🧴 Piel ── 🦠 Microbioma ── 🦴 Hueso
```

- **Mapa del cuerpo (SVG):** cada sistema se colorea 🟢🟡🟠🔴 según su estado. Al hacer clic se ven sus marcadores y su línea de tiempo.
- **Deslizador de tiempo:** L-92 → L-3 → 🚀 vuelo → R+1 → R+194. El cuerpo "cambia de color" con el tiempo.
- **Comparador:** tripulante vs. su línea base, o tripulante vs. tripulante.
- **Simulador de escenarios** 🟧: tormenta solar severa, misión larga con falta de sueño, exposición acumulada. Parte de la respuesta real observada y la proyecta con reglas, **etiquetado como simulación**.

### Dirección visual: la bahía médica de una nave

La interfaz se inspira en las bahías médicas del cine de ciencia ficción, con un diseño propio:
- **Haz de escaneo** que recorre el cuerpo; los sistemas en alerta laten.
- **Enlace de telemetría** que se "conecta" a NASA OSDR y DONKI al abrir.
- **Línea de tiempo de misión** con la franja de vuelo orbital marcada.
- **Copilot con texto de consola** que escribe sus respuestas citando la fuente.
- **Simulador en violeta**, separado visualmente de lo real.

**Demo:** sistema web en `/system` (Next.js) y app de escritorio para Windows que funciona sin conexión (ver sección 3).

### ASTRA Vision: fatiga y estrés con la cámara

Visión por computadora **en el dispositivo** (MediaPipe Face Landmarker: 478 puntos del rostro + 52 expresiones). **El video no sale del equipo.**

| Señal | Qué mide | Referencia |
|---|---|---|
| **PERCLOS** | % del último minuto con los ojos cerrados | ≥ 15 % se asocia a somnolencia |
| Parpadeos por minuto | Ritmo de parpadeo | Normal 8–21/min |
| Duración del parpadeo | Parpadeos lentos = cansancio | Normal 100–400 ms |
| Bostezos | Boca abierta > 1,2 s | — |
| Cabeceos | Caída de la cabeza > 14° durante > 0,7 s | — |
| Tensión facial | Cejas fruncidas, labios apretados, ojos entrecerrados vs. reposo | Calibración de 8 s |
| Inquietud | Movimiento de la cabeza en 10 s | — |

- **Fatiga (0–100)** = PERCLOS + parpadeo lento + bostezos + cabeceos + cierres largos.
- **Estrés (0–100)** = tensión facial + parpadeo acelerado + inquietud.
- Alimenta el sistema **"Sueño y estrés"** del gemelo digital y responde a la pregunta del Copilot *"¿Estoy cansado?"*.
- **3 modos:** cámara en vivo, analizar un video subido, y demo simulada de un turno de 70 s (alerta → cansancio → estrés).
- Cada sesión se guarda en el **historial** (base local) y se sincroniza con el sistema online.
- ⚠️ Indicador experimental, no validado clínicamente.

#### Segundo modelo: YOLO11s en un servidor FastAPI

- **Modelo:** YOLO11s de [driver-drowsiness-detection](https://github.com/Mohab-Refaai/driver-drowsiness-detection) (MIT), entrenado con 14.855 imágenes de conductores. Su autor reporta mAP50 de 98,9 % y F1 de 97,7 % en su propio conjunto de prueba.
- **Clases:** atento · somnolencia · bostezo · distraído · bebiendo · conducta peligrosa.
- **API:** `backend/main.py` con `GET /api/health`, `POST /api/vision/frame` y `GET /docs`. El frontend redirige `/api/*` a este servidor (`ASTRA_API_URL`, por defecto `http://localhost:8000`).
- **Fusión:** el tablero envía unos 3 fotogramas por segundo. La fatiga combina las señales faciales de MediaPipe con el % de fotogramas con somnolencia o bostezo del último minuto, y una nueva métrica de **distracción** mide la atención.
- **Rendimiento:** ~230–310 ms por fotograma en CPU.
- **Arranque:** doble clic en `iniciar_todo.bat` (API en :8000 y web en :3000).
- ⚠️ El modelo se entrenó con conductores de coche, no con astronautas. En ASTRA se usa como demostración del concepto de monitoreo de fatiga en cabina.

## 8. ASTRA Intelligence

### 8.1 Detección de anomalías
- **Cambio frente a la línea base personal** (media de L-92, L-44 y L-3), medido en unidades del **ruido propio de cada marcador** (z).
- **Niveles por marcador:** 🟡 vigilar si z ≥ 1,25 y cambio ≥ 5 % · 🟠 alerta si z ≥ 2 y cambio ≥ 10 % · 🔴 crítico si está fuera del rango clínico del laboratorio.
- **Niveles del score (0–100):** 🟢 < 20 · 🟡 20–39 · 🟠 40–59 · 🔴 ≥ 60.
- **Persistencia:** cuenta cuántos controles post-vuelo seguidos se mantiene el marcador en alerta en la misma dirección ("desde cuándo").
- En el módulo de Fisiología y radiación se usa además el **z robusto** (mediana/MAD) frente a los 10 primeros días de misión.

### 8.2 Health Risk Score (experimental)

```
ruido_marcador = mediana del coeficiente de variación pre-vuelo entre tripulantes (mín. 2 %)
z              = |cambio % vs. línea base| / ruido_marcador
Score_marcador = 90 si está fuera del rango clínico;
                 si no, min(z, 3) / 3 × 80 cuando el cambio es ≥ 5 %
                 (y × 30 cuando es < 5 %, para no alarmar por cambios mínimos)
Score_sistema  = promedio de los 2 marcadores más desviados (0–100)
Score_global   = promedio de los 7 sistemas
                 + 10 por concordancia (≥ 3 sistemas ≥ 40 a la vez), máx. 100
```

El clima espacial (DONKI) no suma al score de Inspiration4 porque hubo **0 SEP y 0 tormentas**; su efecto se explora en el **Simulador** (tormenta S1–S4). Implementación: `frontend/lib/bay/model.ts`.

**Por qué el ruido importa:** la PCR varía un ~80 % entre controles pre-vuelo y el sodio solo un ~2 %. Medir cada marcador contra su propia variación evita falsas alarmas.

**Resultado real (riesgo global ASTRA):**

| Tripulante | L-92 | L-44 | L-3 | R+1 | R+45 | R+82 | R+194 |
|---|---|---|---|---|---|---|---|
| C001 | 26 | 26 | 28 | 34 | 45 | 61 | 61 |
| C002 | 38 | 24 | 42 | **64** | 56 | 48 | 54 |
| C003 | 32 | 47 | 48 | **60** | 66 | 63 | 65 |
| C004 | 20 | 30 | 45 | 46 | 51 | 30 | 59 |

El riesgo sube tras el vuelo en los 4 tripulantes. L-3 ya sale elevado, una posible señal de estrés antes del lanzamiento que ASTRA también detecta.

Ejemplo de salida:

> **ASTRA Health Risk Score: C003 · R+1**
> 🩸 Defensas: **alto** · 🔥 Inflamación: moderado · ⚡ Metabolismo: **alto** (potasio 3,0 y glucosa 103) · ☀️ Ambiente: bajo
> Tendencia: **desfavorable** (neutrófilos siguen bajos en R+194)

⚠️ *Indicador experimental, no una probabilidad clínica validada.*

### 8.3 ASTRA Copilot
Asistente que responde **solo con los datos del tripulante** y siempre cita el marcador y la fuente:

> **Pregunta:** "¿Por qué mi estado empeoró después de aterrizar?"
> **ASTRA:** "En R+1, tus neutrófilos bajaron un 33 % (6.100 → 4.088/µL) y tus leucocitos un 27 % respecto a tu línea base. Tu potasio (3,0 mmol/L) quedó por debajo del rango normal (3,5–5,3) y tu glucosa subió a 103 mg/dL. La inflamación (PCR) subió en toda la tripulación. No hubo eventos de partículas solares durante la misión (NASA DONKI), así que la causa más probable es el estrés del vuelo y la readaptación a la gravedad. Sugerencia: repetir electrolitos, vigilar signos de infección y consultar al médico de vuelo. *Fuentes: OSD-569, OSD-575, DONKI.*"

**Implementación:** plantillas sobre el JSON del tripulante (funciona offline) y, opcionalmente, un LLM con los datos del tripulante como único contexto.

### 8.4 Alertas explicadas
Cada alerta indica: **qué cambió · desde cuándo · posible causa · acción sugerida · fuente**. Siempre con el aviso: *"señal de riesgo, no diagnóstico médico"*.

## 9. Calidad de datos

| Hallazgo | Acción |
|---|---|
| **OSD-569, C003 / L-92: columnas desplazadas** (volumen plaquetario 330 fL cuando lo normal es ~10; 12,9 plaquetas cuando lo normal es ~250) | Muestra excluida. Sin corregirla, la caída de linfocitos aparece como −31 % en vez de **−20 %** |
| **OSD-575, haptoglobina:** valores extremos (+1.677 % en R+194) | Marcada como valor atípico; no entra en el score |
| L-3 elevado en varios tripulantes (posible estrés previo al lanzamiento) | Se reporta; la línea base puede estar algo inflada |
| Analitos `(FEMALE)` con rangos distintos | Nombres unificados |
| **n = 4**, sin grupo control en tierra | Sin valores p ni ML predictivo; se reportan tamaños de efecto y "cuántos de 4" |

## 10. Arquitectura

```
                         FUENTES NASA (reales)
   ┌──────────┬───────────┬──────────────┬─────────┬──────────────┐
 OSDR        DONKI       PDS Curiosity   NTRS      EPIC + Image
 569·575·681 FLR·CME·    RAD (Marte)     (37 refs) Library
             SEP·GST
   └──────────┴───────────┴──────┬───────┴─────────┴──────────────┘
                                 │
        ETL en Python (backend/pipeline · run_all.py · notebook de limpieza)
        esquema: {crew_id, timepoint, sistema, variable, valor, unidad,
                  rango, fuente, source_type REAL/DERIVADO/SIMULADO}
                                 │
              frontend/data/bay.json · frontend/data/monitor.json
                                 │
 ┌───────────────────────────────┴───────────────────────────────┐
 │  FRONTEND · Next.js 16 + React 19 + TypeScript (Bun)          │
 │  Motor de riesgo y alertas (lib/bay/model.ts)                 │
 │  Copilot por reglas (lib/bay/copilot.ts)                      │
 │  Bienestar (lib/wellbeing/model.ts)                           │
 │  ASTRA Vision: MediaPipe Face Landmarker en el dispositivo    │
 │  Almacén local (lib/store): SQLite (escritorio) o navegador   │
 └───────┬──────────────────────────────────────┬────────────────┘
         │ /api/vision/frame                    │ /api/sync
 ┌───────┴──────────────────┐        ┌──────────┴────────────────┐
 │ BACKEND · FastAPI        │        │ Servidor de sincronización│
 │ YOLO11s (Ultralytics)    │        │ SQLite · gana el más      │
 │ /api/health /api/monitor │        │ reciente · lápidas · token│
 └──────────────────────────┘        └───────────────────────────┘
         │
 APP DE ESCRITORIO · Electron (app://astra) + node:sqlite · instalador NSIS
```

### Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, gráficos SVG propios; bilingüe y con tema claro/oscuro |
| Visión en el dispositivo | `@mediapipe/tasks-vision` (Face Landmarker, 478 puntos + 52 expresiones, WASM local) |
| API y modelo | FastAPI, Uvicorn, Ultralytics YOLO11s, PyTorch, Pillow |
| Sincronización | FastAPI + SQLite (`backend/sync.py`) |
| Escritorio | Electron 45, electron-builder (NSIS), `node:sqlite` |
| Datos | Python (requests, pandas), notebook Jupyter de limpieza y análisis exploratorio, prototipo Streamlit + Plotly (`backend/pipeline/dashboard.py`) |

### API del backend

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | Estado del modelo YOLO11s y sus clases |
| POST | `/api/vision/frame` | Analiza un fotograma (JPEG/PNG ≤ 5 MB): estado, confianza, caja, pistas de fatiga y atención |
| GET | `/api/monitor` | Datos NASA del módulo de Fisiología y radiación |
| POST | `/api/sync` | Sube y baja cambios (tripulantes, sesiones, registros diarios) |
| GET | `/api/sync/status` | Estado del servidor de sincronización |
| GET | `/api/app/version` | Versión publicada de la app de escritorio |
| GET | `/downloads/*` | Instalador de Windows |
| GET | `/docs` | Documentación interactiva (Swagger) |

### Repositorio

```
nasa/
├─ iniciar_todo.bat              # arranca API (:8000) y web (:3000)
├─ backend/
│  ├─ main.py                    # FastAPI: visión YOLO11s, monitor, descargas
│  ├─ sync.py                    # servidor de sincronización (SQLite)
│  ├─ app_version.json           # versión anunciada a las apps instaladas
│  ├─ models/drowsiness_yolo11s.pt
│  └─ pipeline/                  # ETL NASA: osdr, donki, curiosity_rad, ntrs,
│                                #   media_context, simulate_and_merge, export_frontend
├─ frontend/
│  ├─ app/                       # rutas: / y /system/{wellbeing,monitor,resources,settings}
│  ├─ components/                # site · bay · wellbeing · monitor · resources · settings · app
│  ├─ lib/                       # bay (riesgo, copilot), vision, wellbeing, store (sync), i18n
│  ├─ data/                      # bay.json (OSDR + DONKI) · monitor.json (pipeline)
│  ├─ public/                    # imágenes, modelo MediaPipe, instalador
│  └─ scripts/                   # check-crew.ts · check-wellbeing.ts
├─ desktop/                      # Electron: main.cjs, preload.cjs, db.cjs, scripts de release
└─ docs/                         # PROYECTO, BIENESTAR, NUEVOS_TRIPULANTES, OFFLINE_ONLINE, analisis/
```

### Cómo ejecutarlo

```bash
# todo junto (Windows)
iniciar_todo.bat

# o por partes
cd backend && pip install -r requirements.txt && python -m uvicorn main:app --port 8000
cd frontend && bun install && bun run dev          # http://localhost:3000
cd backend/pipeline && python run_all.py            # refresca los datos NASA
cd desktop && bun run release                       # genera el instalador de Windows
```

## 11. Estado de construcción

| Funcionalidad | Estado |
|---|---|
| ETL OSD-569 + OSD-575 + DONKI y limpieza de datos | ✅ Hecho |
| Bahía médica: escáner, semáforo, línea de tiempo, estado por sistema | ✅ Hecho |
| Detección de anomalías, alertas explicadas y persistencia | ✅ Hecho |
| Riesgo ASTRA 0–100 multisistema | ✅ Hecho |
| ASTRA Copilot (reglas sobre los datos, con fuentes) | ✅ Hecho |
| Mapa de calor de la tripulación + clima espacial de la misión | ✅ Hecho |
| ASTRA Vision: MediaPipe + YOLO11s + historial de sesiones | ✅ Hecho |
| Simulador de escenarios 🟧 | ✅ Hecho |
| Nuevos tripulantes (asistente, CSV, línea base personal/provisional) | ✅ Hecho |
| Bienestar y sueño (registro diario, tendencias, wearable, 7 alertas HRP) | ✅ Hecho |
| Fisiología y radiación (DONKI 2026, Curiosity RAD, OSD-681, NTRS, EPIC) | ✅ Hecho |
| Datos y recursos (descarga CSV, exportación, glosario) | ✅ Hecho |
| App de escritorio offline + sincronización + aviso de versión | ✅ Hecho (Windows) |
| Bilingüe ES/EN, tema claro/oscuro, tamaño de texto | ✅ Hecho |
| Copilot con LLM (los datos del tripulante como único contexto) | 💡 Siguiente |
| OSD-570, 571, 574, 572, 630, 656 (células, plasma, piel, microbioma, orina) | 💡 Fase 2 |
| Instalador firmado, macOS/Linux, cuentas y consentimiento | 💡 Fase 2 |

## 12. Equipo

| Rol | Función |
|---|---|
| Biología / investigación | Validación científica, literatura NASA, umbrales |
| Data Science | ETL, anomalías, Health Risk Score |
| Frontend | Twin, dashboard, visualizaciones |
| IA / Full stack | Copilot, integración DONKI |
| Producto / UX | Narrativa, video, presentación |

## 13. Pitch (30 segundos)

> "En el espacio, el cuerpo entero cambia a la vez, pero hoy cada análisis se mira por separado. Con datos reales de la NASA de Inspiration4, ASTRA descubrió que tras solo **3 días** en órbita, **los 4 tripulantes** tuvieron inflamación al alza (**PCR +48 %**), glucosa al alza (**+24 %**) y defensas a la baja (neutrófilos **−13 %**). En algunos casos esto duró **6 meses**, y casi todo seguía 'en rango normal'. ASTRA es un gemelo digital de cuerpo completo que compara a cada astronauta consigo mismo, cruza el clima espacial de la NASA y le dice al médico qué sistema vigilar, por qué y hasta cuándo."

## 14. Por qué ASTRA puede ganar

| Criterio | Cómo lo cumple ASTRA |
|---|---|
| **Credibilidad científica** | Datos 100 % reales en el núcleo, etiquetas REAL/DERIVADO/SIMULADO, calidad de datos documentada |
| **Innovación técnica** | Integración de 7 fuentes NASA (OSDR 569/575/681, DONKI, Curiosity RAD, NTRS, EPIC), gemelo digital, score multisistema con ruido por marcador, copilot basado en datos y 2 modelos de visión |
| **Experiencia de usuario** | Mapa del cuerpo: el estado se entiende en segundos y cada alerta dice qué hacer; bilingüe, tema claro/oscuro y adaptable a móvil |
| **Cobertura del reto** | Los **5 peligros NASA HRP** cubiertos (sección 3.11): sangre y radiación, sueño y conducta, ambiente cerrado y funcionamiento **sin conexión** |
| **Listo para usarse** | Sistema web + **app de escritorio offline** con sincronización; registra **nuevos tripulantes** sin tocar el código |
| **Impacto demostrable** | Detecta un patrón de estrés en 4 de 4 tripulantes que el laboratorio convencional no marca, y el mismo método se lleva a la minería de Ayacucho |

## 15. Limitaciones

- **4 personas:** resultados exploratorios, no generalizables.
- **Sin grupo control:** el efecto del espacio no se separa del estrés del viaje.
- **Microgravedad y radiación no son separables** con estos datos. No afirmamos efectos sinérgicos.
- **Ritmo cardiaco, sueño y estrés de Inspiration4 no son públicos:** en el módulo de Fisiología y radiación son una serie **sintética** (ASTR-1) calibrada con DONKI y NTRS; en Bienestar se cargan del usuario o de un ejemplo **simulado**.
- **OSD-681 es un análogo animal** de microgravedad, no datos humanos.
- **YOLO11s se entrenó con conductores**, no con astronautas; ASTRA Vision es experimental y no está validado clínicamente.
- **Curiosity RAD mide en Marte,** no en órbita baja. Se usa solo como referencia.
- **El Health Risk Score es experimental. Las alertas son señales, no diagnósticos.**

## 16. Checklist de entrega

- [ ] Repositorio público con README
- [x] Recursos NASA citados en el sistema (OSD-569, OSD-575, OSD-681, DONKI, Curiosity RAD, NTRS, EPIC) — módulo Datos y recursos
- [x] Instalador de Windows publicado en `/downloads/`
- [ ] Tablero desplegado con URL pública
- [ ] Video demo
- [ ] Presentación
- [x] Limitaciones y etiquetas de datos visibles
- [ ] Uso de IA declarado

## 17. Referencias

- NASA OSDR **OSD-569**: *Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC).*
- NASA OSDR **OSD-575**: *SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays.*
- NASA OSDR **OSD-570, 571, 572, 573, 574, 630, 656, 687**: otros estudios de la tripulación Inspiration4.
- NASA CCMC **DONKI**: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA PDS **Curiosity RAD** (MSL-M-RAD-3-RDR-V1.0).
- NASA OSDR **OSD-681**: biotelemetría (presión intracraneal y temperatura) en inclinación cabeza abajo.
- NASA **NTRS** (Technical Reports Server): 37 informes técnicos que respaldan los umbrales.
- NASA **EPIC** (DSCOVR) y **NASA Image and Video Library**.
- Modelo YOLO11s: [driver-drowsiness-detection](https://github.com/Mohab-Refaai/driver-drowsiness-detection) (MIT) · Google **MediaPipe** Face Landmarker.
- Rooney B.V. et al. (2019). *Herpes Virus Reactivation in Astronauts During Spaceflight and Its Application on Earth.* Frontiers in Microbiology 10:16. https://www.frontiersin.org/articles/10.3389/fmicb.2019.00016
- Barger L.K. et al. (2014). *Prevalence of sleep deficiency and use of hypnotic drugs in astronauts.* The Lancet Neurology. doi:10.1016/S1474-4422(14)70122-X
- NASA Human Research Program, *5 Hazards of Human Spaceflight*: https://www.nasa.gov/hrp/hazards
- FAA, tabla de seguridad de vuelos espaciales tripulados (dic. 2025): https://www.faa.gov/media/77636
- GHSA (2026), *Wake Up Call* (somnolencia al volante).
- Colección *Space Omics and Medical Atlas (SOMA)*, Nature / Nature Communications, 2024.
