# mini-proyecto-2-backend

API REST con **Node.js**, **TypeScript**, **Express**, **Firebase Admin SDK** (**Auth** + **Firestore**) y documentación **Swagger** (definición centralizada en `src/docs/swagger.ts`).

## Requisitos

- Node.js 20+ (recomendado)
- Proyecto en [Firebase Console](https://console.firebase.google.com/) con **Authentication** (Email/contraseña y **Google** habilitados en el cliente) y **Firestore** habilitados
- Cuenta de servicio (JSON) para el backend: *Project settings → Service accounts → Generate new private key*

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Variables de entorno (valores reales solo en **`.env`**, que no se sube a git; **`.env.example`** es plantilla):

   ```bash
   cp .env.example .env
   ```

   | Variable | Uso |
   |----------|-----|
   | `FIREBASE_SERVICE_ACCOUNT` | JSON del service account en **una línea** que empiece por `{`, **o** ruta a un `.json` relativa al backend (p. ej. `./clave.json`). Alternativa local: `GOOGLE_APPLICATION_CREDENTIALS` apuntando al JSON. |
   | `JWT_SECRET` | Obligatorio para firmar el **JWT del backend** que devuelve la sesión estudiantil cuando el perfil está completo. |
   | `INSTITUTIONAL_EMAIL_DOMAINS` | Opcional. Lista separada por comas de dominios permitidos en **registro manual** (ej. `unal.edu.co,unal.edu`). **Vacío** = se acepta cualquier dominio (útil en desarrollo). |
   | `PORT`, `FRONTEND_URL` | Puerto (por defecto **1206**) y origen CORS del frontend. |

3. Datos iniciales en Firestore:

   ```bash
   npm run db:seed
   ```

   Vacía y recrea: `roles`, `permisos`, `rolPermisos`, `usuarios`, `usernames` (reservas de *username*). El rol **`estudiante`** debe existir antes de registrar alumnos por API.

4. Arranque en desarrollo:

   ```bash
   npm run dev
   ```

## Autenticación estudiantil (Firebase + API)

El backend **no** abre el popup de Google ni escribe la contraseña en el navegador: eso lo hace el **cliente** con el SDK de Firebase. Aquí se crean usuarios con **Admin SDK**, se guarda el **perfil en Firestore** y se validan **ID tokens** de Firebase.

### Registro manual (email + contraseña)

1. `POST /api/auth/register` — Crea usuario en **Firebase Auth**, reserva **username** y guarda perfil en **`usuarios/{uid}`** con rol `estudiante`. Respuesta incluye **`customToken`** para que el cliente ejecute `signInWithCustomToken`.
2. El cliente inicia sesión en Firebase y obtiene el **ID token**.
3. `POST /api/auth/session` con cabecera `Authorization: Bearer <ID token Firebase>` — Si el perfil está completo, la respuesta incluye **`data.token`** (JWT del backend, 7 días) para rutas que usen `authenticateToken`.

### Registro / login con Google

1. El cliente autentica con **Google** (Firebase) y obtiene el **ID token**.
2. `POST /api/auth/session` con el mismo Bearer — **Primer ingreso:** se crea perfil sin username → **`needsUsername: true`**, **`token`** null. **Usuario ya completo:** **`needsUsername: false`** y JWT en **`data.token`**.
3. `POST /api/auth/google/complete-username` — Mismo Bearer (sesión Google), body `{ "username" }` — Completa perfil y devuelve JWT.

### Utilidad

- `GET /api/auth/username-available?username=` — Comprueba si el nombre de usuario está libre (formato válido y unicidad).

## CRUD de usuarios (administración)

Rutas bajo **`/api/auth/users`**. Requieren cabecera `Authorization: Bearer <JWT del backend>` y permisos del rol (el admin del seed tiene todos).

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `POST` | `/api/auth/login` | — | Login admin (email + contraseña en Firestore). Devuelve JWT. |
| `GET` | `/api/auth/users` | `usuarios.consultar` | Listado con `page`, `limit`, `rolId`, `estado`, `email`. |
| `GET` | `/api/auth/users/:id` | `usuarios.consultar` | Detalle de un usuario (admin o estudiante). |
| `POST` | `/api/auth/users` | `usuarios.crear` | Alta de usuario **administrativo** (`nombre`, `documento`, `email`, `password`, `rolId`). |
| `PUT` | `/api/auth/users/:id` | `usuarios.actualizar` | Actualización parcial (admin: todos los campos; estudiante: `rolId`, `estado`). |
| `PATCH` | `/api/auth/users/:id/deshabilitar` | `usuarios.deshabilitar` | Marca `estado: INACTIVO` (en estudiantes también desactiva Firebase Auth). |

**Probar con el admin del seed:**

```http
POST /api/auth/login
{ "email": "admin@admin.com", "password": "Admin1234!" }
```

Usá el `data.token` de la respuesta en el resto de llamadas.

Los estudiantes se crean con `POST /api/auth/register` (Firebase); el CRUD solo **consulta/actualiza/deshabilita** esos perfiles, no los crea por esta vía.

## Perfil del estudiante (US-04, US-05)

Rutas bajo **`/api/auth/users/me`**. Requieren JWT del backend (sesión estudiantil completa).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/auth/users/me` | Ver perfil propio |
| `PUT` | `/api/auth/users/me` | Editar `nombres`, `apellidos`, `username`, `avatar`, `email` |
| `DELETE` | `/api/auth/users/me` | Eliminar cuenta (Firestore + Firebase Auth) |

## Salas de estudio (US-06, US-07, TS-02)

Rutas bajo **`/api/salas`**. Requieren JWT del backend de sesión estudiantil (`rolId: estudiante`).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/salas/mias` | Dashboard: salas creadas por el anfitrión |
| `POST` | `/api/salas` | Crear sala (`{ "nombre" }`); devuelve ID único |
| `GET` | `/api/salas/:id` | Detalle (creador o participante) |
| `PUT` | `/api/salas/:id` | Editar nombre (**solo creador**) |
| `DELETE` | `/api/salas/:id` | Eliminar sala y mensajes (**solo creador**) |
| `POST` | `/api/salas/:id/unirse` | Unirse validando que exista el ID |
| `GET` | `/api/salas/:id/mensajes` | Historial reciente (`?limit=50`) |

### WebSocket (Socket.io)

Mismo host/puerto que la API REST. Autenticación en el handshake:

```javascript
io("http://localhost:1206", {
  auth: { token: "<JWT del backend>" },
});
```

| Evento (cliente → servidor) | Descripción |
|-----------------------------|-------------|
| `sala:unirse` | `{ salaId }` — entra al canal en tiempo real |
| `sala:salir` | `{ salaId }` — sale del canal |
| `mensaje:enviar` | `{ salaId, texto }` — guarda en Firestore y emite al resto |

| Evento (servidor → cliente) | Descripción |
|-----------------------------|-------------|
| `mensaje:nuevo` | Mensaje persistido |
| `presencia:actualizada` | `{ salaId, usuarios[] }` — quién está conectado |

### WebRTC (Lógica P2P)

La comunicación audiovisual utiliza WebRTC para establecer
conexiones Peer-to-Peer entre participantes de una sala.

El servidor Socket.io se utiliza únicamente como servidor
de señalización (signaling server) para intercambiar:

- SDP Offer
- SDP Answer
- ICE Candidates

#### Flujo de conexión

1. Usuario A entra a la sala.
2. Usuario B entra a la sala.
3. Se intercambian ofertas SDP mediante Socket.io.
4. Se intercambian respuestas SDP.
5. Se intercambian ICE Candidates.
6. Se establece la conexión P2P.
7. Los streams de audio y video se transmiten directamente entre pares.

#### Compartir pantalla

Cuando un usuario comparte pantalla:

- Se obtiene un nuevo MediaStream mediante
  `navigator.mediaDevices.getDisplayMedia()`.
- El track de video original es reemplazado usando
  `RTCRtpSender.replaceTrack()`.
- Los demás participantes reciben automáticamente
  el nuevo stream sin reconectar la llamada.

#### Control de estados AV

Los cambios de mute y cámara apagada se sincronizan
mediante eventos Socket.io.

Eventos:

- media:toggle-audio
- media:toggle-video
- media:state-changed

Estos eventos permiten actualizar los iconos visuales
de todos los participantes en tiempo real.

## Reglas de seguridad Firestore (criterio C4)

El archivo **`firestore.rules`** en la raíz del repo define quién puede leer/escribir desde el **cliente** (SDK web). Las **escrituras** de negocio (registro, perfil, salas, mensajes) las hace el **backend** con Admin SDK y no dependen de estas reglas.

| Colección | Cliente autenticado |
|-----------|-------------------|
| `usuarios/{uid}` | Solo **lectura** de su propio documento (`uid` = `request.auth.uid`) |
| `salas`, `mensajes` | **Lectura** si es creador o está en `participantes` |
| `roles`, `permisos`, `rolPermisos`, `usernames` | Denegado (solo API) |

### Publicar reglas (elige una opción)

**Opción A — Consola (rápida)**

1. [Firebase Console](https://console.firebase.google.com/) → proyecto **crossflow-bbbc0** → **Firestore Database** → pestaña **Reglas**.
2. Copia el contenido de `firestore.rules` del repo y pégalo en el editor.
3. Pulsa **Publicar**.

**Opción B — Firebase CLI**

```bash
npm install -g firebase-tools
firebase login
cd mini-proyecto-2-backend
firebase deploy --only firestore:rules
```

El proyecto por defecto está en `.firebaserc` (`crossflow-bbbc0`). Si usás otro proyecto: `firebase use <project-id>`.

### Evidencia para la rúbrica (PR / informe)

- Enlace al archivo `firestore.rules` en el repositorio.
- Captura de la consola con las reglas **publicadas** y fecha.
- Nota: el frontend debe usar **`/api`** y Socket.io; si lee Firestore directo sin estar logueado en Firebase Auth, verá `permission-denied` (esperado).

## Modelo de datos (Firestore)

| Colección | ID de documento | Descripción |
|-----------|------------------|-------------|
| `roles` | `admin`, `user`, `cliente`, `estudiante`, … | Catálogo de roles. Los estudiantes nuevos usan **`estudiante`**. |
| `permisos` | `usuarios.crear`, … | Permisos del sistema. |
| `rolPermisos` | `admin__usuarios.crear`, … | Enlaces rol ↔ permiso. |
| `usuarios` | **Firebase UID** (estudiantes) o `seed-admin` (demo) | Estudiante: `firebaseUid`, `nombres`, `apellidos`, `username`, `avatar`, `email`, `rolId`, `profileComplete`, `authProviders`, etc. Admin seed: `passwordHash`, `documento`, sin Firebase. |
| `usernames` | Username **normalizado** (minúsculas) | Documento `{ uid }` apuntando al UID de Firebase; garantiza unicidad. |
| `salas` | ID autogenerado | `nombre`, `creadorUid`, `participantes[]`, timestamps. |
| `salas/{id}/mensajes` | ID autogenerado | `uid`, `username`, `texto`, `createdAt`. |

El JWT del backend (`authenticateToken`) usa **`rolId`** como id del documento en `roles` e **`id`** como id del documento en `usuarios` (para estudiantes coincide con el **UID de Firebase**).

## Documentación OpenAPI

- **Swagger UI:** [http://localhost:1206/api-docs](http://localhost:1206/api-docs)
- **JSON:** [http://localhost:1206/api-docs.json](http://localhost:1206/api-docs.json)

Los paths y esquemas de **Auth** están definidos en **`src/docs/swagger.ts`** (no en archivos de rutas).

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor con recarga (`tsx watch`) |
| `npm run build` | Compila TypeScript y extensiones `.js` en `dist/` |
| `npm run prod` | `node dist/src/index.js` |
| `npm run typecheck` | Verificación de tipos |
| `npm run db:seed` | **Vacía** colecciones de seed y **vuelve a crear** roles, permisos, enlaces, usuario admin y tabla `usernames` |

## Estructura principal

- `src/app.ts` — Express, CORS, Swagger, rutas, errores
- `lib/firebase.ts` — Firebase Admin (Firestore + **Auth**)
- `lib/firestoreCollections.ts` — Nombres de colecciones
- `src/routes/auth.routes.ts` — Rutas `/auth/*` (login, estudiantes, `/auth/users`)
- `src/routes/users.routes.ts` — CRUD `/auth/users`
- `src/services/studentAuth.service.ts` — Lógica de registro, sesión y username Google
- `src/services/usuario.service.ts` — CRUD y login administrativo
- `src/services/sala.service.ts` — Salas, mensajes y acceso
- `src/socket/index.ts` — Socket.io (presencia y chat en tiempo real)
- `src/middlewares/auth.middleware.ts` — JWT interno, permisos, `express-validator`
- `src/middlewares/firebase-id-token.middleware.ts` — Verificación del **ID token** de Firebase
- `src/docs/swagger.ts` — Especificación OpenAPI
- `src/scripts/seed.ts` — Seed de Firestore

## Usuario de prueba admin (tras `db:seed`)

- **Email:** `admin@admin.com`
- **Contraseña:** `Admin1234!`
- **Id de documento Firestore:** `seed-admin` (JWT de demo con `id: "seed-admin"`)

Este usuario **no** pasa por Firebase Auth de estudiantes; sirve para pruebas del modelo legacy en Firestore.

## Despliegue (Render u otros)

- **Build:** `npm install && npm run build`
- Asegura `FIREBASE_SERVICE_ACCOUNT` (o credenciales equivalentes), **`JWT_SECRET`** y dominios de correo si usás **`INSTITUTIONAL_EMAIL_DOMAINS`**.
- Ejecuta `npm run db:seed` cuando quieras **resetear** datos de demo (incluye borrar reservas en `usernames`).

## Licencia

ISC
