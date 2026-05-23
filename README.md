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

## Modelo de datos (Firestore)

| Colección | ID de documento | Descripción |
|-----------|------------------|-------------|
| `roles` | `admin`, `user`, `cliente`, `estudiante`, … | Catálogo de roles. Los estudiantes nuevos usan **`estudiante`**. |
| `permisos` | `usuarios.crear`, … | Permisos del sistema. |
| `rolPermisos` | `admin__usuarios.crear`, … | Enlaces rol ↔ permiso. |
| `usuarios` | **Firebase UID** (estudiantes) o `seed-admin` (demo) | Estudiante: `firebaseUid`, `nombres`, `apellidos`, `username`, `avatar`, `email`, `rolId`, `profileComplete`, `authProviders`, etc. Admin seed: `passwordHash`, `documento`, sin Firebase. |
| `usernames` | Username **normalizado** (minúsculas) | Documento `{ uid }` apuntando al UID de Firebase; garantiza unicidad. |

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
