# ASTRA Health: offline y online

ASTRA funciona de dos formas con el mismo código:

| | Versión online (web) | App de escritorio (instalador) |
|---|---|---|
| Cómo se usa | Se abre en el navegador | Se descarga e instala en Windows 10/11 |
| Internet | Necesaria | **No necesaria**: todo va dentro de la app |
| Datos locales | Almacenamiento del navegador | **SQLite** en un archivo del equipo |
| Datos compartidos | Servidor (SQLite en el backend) | Se suben y bajan al volver la conexión |
| Uso pensado | Consulta y gestión | Monitoreo durante la misión, en cabina o en zonas sin red |

## Cómo funciona el instalador

1. **Descarga.** En el landing, «Descargar para Windows» (`/downloads/ASTRA-Health-Setup.exe`, unos 126 MB). El enlace también está en el menú Recursos.
2. **Instalación.** El asistente permite elegir la carpeta y crea los accesos directos del escritorio y del menú Inicio. No requiere permisos de administrador: se instala para el usuario.
3. **Qué queda instalado.**
   - La aplicación completa: bahía médica, monitor, landing, imágenes y el modelo de visión facial.
   - Se sirve desde un origen privado (`app://astra`), sin servidor ni internet.
   - La base de datos se crea al primer arranque en `%APPDATA%\ASTRA Health\astra.db`.
4. **Uso sin conexión.**
   - Se añaden tripulantes y se monitorea la fatiga con la cámara.
   - Cada sesión se guarda en SQLite.
   - La barra superior muestra «Sin conexión · modo local» y cuántos cambios esperan subir.
5. **Sincronización.** Cuando hay red, la app sube lo pendiente y baja lo nuevo de otros dispositivos. Lo hace sola:
   - al abrirse;
   - al volver la conexión;
   - 3 segundos después de cada cambio;
   - cada minuto.

   También se puede forzar con «Sincronizar ahora».
6. **Actualizaciones.**
   - Al arrancar con conexión, la app consulta `/api/app/version`.
   - Si hay una versión más nueva, la barra superior muestra «Actualización» y el panel ofrece descargar el nuevo instalador.
   - Instalarlo encima conserva la base de datos.

## Reglas de sincronización

- Cada registro (tripulante, sesión de monitoreo o registro diario de bienestar) tiene un identificador único, `updated_at` en milisegundos y un indicador de borrado.
- **Gana la escritura más reciente.** Un cambio más antiguo nunca pisa uno más nuevo, ni en el servidor ni en el equipo.
- Los borrados se envían como «lápidas» para que también desaparezcan en los demás dispositivos.
- Cada dispositivo guarda un cursor del servidor y solo descarga lo cambiado desde su última sincronización. Nunca vuelve a recibir lo que él mismo subió.
- Si el servidor no responde, no se pierde nada: los cambios siguen marcados como pendientes.

## Seguridad

- Las páginas no tienen acceso a Node.js. Solo pueden llamar a la base de datos por un puente limitado: 7 operaciones con tablas validadas.
- La cámara solo se concede a las páginas propias de la app.
- Los enlaces externos se abren en el navegador del sistema.
- **Token de acceso:** si el servidor define `ASTRA_SYNC_TOKEN`, solo sincronizan los dispositivos que lo tengan. Se configura en «Conexión y datos».
- El instalador **no está firmado**: Windows SmartScreen mostrará un aviso. Para distribuirlo hace falta un certificado de firma de código; electron-builder lo usa automáticamente si se configura.

## Componentes

| Parte | Archivo | Qué hace |
|---|---|---|
| Servidor de sync | `backend/sync.py` (tablas crew, sessions, daily) | `POST /api/sync`, `GET /api/sync/status`, `GET /api/app/version`; SQLite en `backend/data/astra.db` |
| Versión publicada | `backend/app_version.json` | Versión, enlace y notas que ven las apps instaladas |
| Almacén local | `frontend/lib/store/` | Misma interfaz para SQLite (escritorio) y navegador (web) |
| Motor de sync | `frontend/lib/store/sync.ts`, `components/app/SyncContext.tsx` | Subir y bajar cambios, estado de conexión, aviso de versión |
| Panel de conexión | `components/app/SyncStatus.tsx` | Estado, base de datos local, servidor, token, «Sincronizar ahora» |
| Historial | `components/bay/Sessions.tsx` | Sesiones de monitoreo guardadas, con su estado de sincronización |
| App de escritorio | `desktop/main.cjs`, `preload.cjs`, `db.cjs` | Ventana, origen `app://`, permisos y SQLite (`node:sqlite`) |

## Publicar una versión nueva

```bash
# 1. sube la versión en desktop/package.json ("version": "1.0.1")
cd desktop
bun run release   # compila la web estática, crea el instalador, lo copia a frontend/public/downloads
                  # y actualiza backend/app_version.json; las apps instaladas verán el aviso
```

Para probar la app sin instalarla: `cd desktop && bun run start`.

## Arranque del sistema online

```bash
cd backend && python -m uvicorn main:app --port 8000   # API + sync (el modelo de conducta es opcional)
cd frontend && bun run build && bun run start           # web en http://localhost:3000
```

En la app de escritorio, la dirección del sistema online se configura en «Conexión y datos». Por defecto es `http://localhost:8000` o el valor de `NEXT_PUBLIC_ASTRA_ONLINE_URL` al compilar.

## Verificado

- El servidor de sync rechaza los cambios antiguos, propaga los borrados, no reenvía a cada dispositivo lo suyo y exige el token cuando está configurado.
- La base SQLite local dentro de Electron cubre pendientes, limpieza tras subir, aplicación de remotos y meta, y rechaza nombres de tabla inválidos.
- De punta a punta: un tripulante y una sesión creados en la app de escritorio llegaron al servidor, y un navegador distinto los recibió en la versión web.
- La app empaquetada arranca sin servidor en modo local, y con servidor muestra «Sincronizado» y avisa de una versión más nueva.

## Límites

- Instalador solo para Windows por ahora; electron-builder puede generar también macOS y Linux.
- La actualización requiere descargar e instalar el nuevo instalador. La actualización silenciosa automática necesitaría firmar el código y alojar las versiones.
- Los datos NASA de la tripulación van dentro de la app. Actualizarlos requiere una versión nueva.
