# Nuevos tripulantes en ASTRA

ASTRA compara a cada persona **consigo misma**, no con un rango general. Por eso sirve para cualquier tripulante nuevo (o un minero, un piloto o un trabajador por turnos) en cuanto tenga sus análisis.

## Cómo se añade una persona

En **Sistema → Bahía médica**, el botón **«Nuevo tripulante»** (enlace directo: `/system#add-crew`) abre un asistente de 3 pasos:

1. **Perfil.** Nombre o código, sexo, edad, rol en la misión (comandante, piloto, especialista, oficial médico), misión y notas clínicas.
2. **Análisis de sangre.**
   - Se marcan los controles disponibles: 3 meses, 6 semanas y 3 días antes del vuelo; 1 día, 6 semanas, 3 y 6 meses después.
   - Los 33 marcadores aparecen agrupados por sistema del cuerpo, cada uno con su unidad y su rango normal.
   - Mientras se escribe, los valores fuera de rango se marcan en naranja y los que no son números en rojo; con valores inválidos no se puede avanzar.
   - Alternativas: **Importar CSV** (rellena la tabla para revisarla), **Plantilla** y **Ejemplo** (perfil SIMULADO).
3. **Revisión.** Antes de guardar muestra la persona, cuántos marcadores tiene, los valores fuera de rango, si la línea base será personal o provisional y el **riesgo ASTRA estimado en cada control**.

Cada tripulante añadido se puede **editar** (lápiz en su chip) o **quitar** (×, con confirmación). Se guarda en la base de datos local (SQLite en la app de escritorio) y se sincroniza con el sistema online, incluido su perfil.
## Formato del CSV

- Una fila por marcador y una columna por control.
- Separador: coma o punto y coma. Decimales con punto o con coma.

| Columna | Momento | Código NASA equivalente |
|---|---|---|
| `before_3m` | 3 meses antes del vuelo | L-92 |
| `before_6w` | 6 semanas antes | L-44 |
| `before_3d` | 3 días antes | L-3 |
| `after_1d` | 1 día después del vuelo | R+1 |
| `after_6w` | 6 semanas después | R+45 |
| `after_3m` | 3 meses después | R+82 |
| `after_6m` | 6 meses después | R+194 |

- La primera columna (`marker`) acepta el código del laboratorio (`CRP`, `GLUCOSE`…) o el nombre en inglés o en español. Los códigos NASA también sirven como cabecera.
- Las celdas vacías se ignoran, igual que los marcadores desconocidos (se listan al subir el archivo).

## Línea base: personal o provisional

| Caso | Línea base | Etiqueta |
|---|---|---|
| 2 o más controles antes del vuelo en al menos el 80 % de sus marcadores | Promedio de sus propios controles previos | **LÍNEA BASE PERSONAL** |
| Menos controles previos (arranque en frío) | Promedio de las líneas base de los 4 tripulantes de Inspiration4 | **LÍNEA BASE PROVISIONAL** |

- La variación habitual de cada marcador, que decide si un cambio es relevante, siempre se toma de la tripulación real de Inspiration4.
- Los rangos clínicos se toman de los informados por el laboratorio de la NASA.

## Límites

- La referencia poblacional viene de solo 4 personas: los resultados son exploratorios.
- El simulador de escenarios parte siempre de la respuesta media de la tripulación real, no de los tripulantes añadidos.
- Los datos no salen del navegador. Para uso real harían falta almacenamiento en el servidor, cuentas y consentimiento.

## Verificación

`bun scripts/check-crew.ts` (dentro de `frontend/`) comprueba la plantilla, el ejemplo simulado y un CSV parcial con decimales con coma.
