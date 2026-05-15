# mini-proyecto-2-backend

API REST con **Node.js**, **TypeScript**, **Express**, **Firebase Admin SDK** (**Firestore**, NoSQL) y documentación **Swagger**.

## Requisitos

- Node.js 20+ (recomendado)
- Proyecto en [Firebase Console](https://console.firebase.google.com/) con **Firestore** habilitado
- Cuenta de servicio (JSON) para el backend: *Project settings → Service accounts → Generate new private key*

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Autenticación del Admin SDK (elige una):

   - **Local:** en `.env`, define `GOOGLE_APPLICATION_CREDENTIALS` con la ruta al JSON descargado (no lo subas a git; está en `.gitignore` con patrón `*serviceAccount*.json`).
   - **Render / CI:** define `FIREBASE_SERVICE_ACCOUNT` con el **contenido completo del JSON en una sola línea** (string JSON válido). El código hace `JSON.parse` y usa `admin.credential.cert(...)`.

   También configura `JWT_SECRET` y, si aplica, `FRONTEND_URL` y `PORT`.

3. Datos iniciales en Firestore:

   ```bash
   npm run db:seed
   ```

   Crea colecciones y documentos de ejemplo: `roles`, `permisos`, `rolPermisos`, `usuarios`.

4. Arranque en desarrollo:

   ```bash
   npm run dev
   ```

Puerto por defecto: **1206** (`PORT`).

## Modelo de datos (Firestore)

| Colección     | ID de documento (ejemplo) | Campos relevantes |
|---------------|---------------------------|-------------------|
| `roles`       | `admin`, `user`, `cliente` | `nombre`, `descripcion`, `activo` |
| `permisos`    | `usuarios.crear`, …       | `codigo`, `nombre`, `descripcion`, `modulo` |
| `rolPermisos` | `admin__usuarios.crear` (codificado) | `rolId`, `permisoCodigo` |
| `usuarios`    | ID autogenerado           | `email`, `documento`, `passwordHash`, `rolId` (id del rol, p. ej. `admin`) |

El JWT debe incluir `rolId` como **id del documento de rol** (p. ej. `admin`) e `id` como **id del documento de usuario** en `usuarios`.

## Documentación OpenAPI

- Swagger UI: [http://localhost:1206/api-docs](http://localhost:1206/api-docs)
- JSON: [http://localhost:1206/api-docs.json](http://localhost:1206/api-docs.json)

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor con recarga (`tsx watch`) |
| `npm run build` | Compila TypeScript y extensiones `.js` en `dist/` |
| `npm run prod` | `node dist/src/index.js` |
| `npm run typecheck` | Verificación de tipos |
| `npm run db:seed` | Puebla Firestore (idempotente con `merge` donde aplica) |

## Estructura principal

- `src/app.ts` — Express, CORS, Swagger, rutas, errores
- `lib/firebase.ts` — Inicialización de Firebase Admin y acceso a Firestore
- `lib/firestoreCollections.ts` — Nombres de colecciones
- `src/middlewares/` — JWT, permisos (`checkPermissions` lee `rolPermisos`), validación
- `src/scripts/seed.ts` — Seed de Firestore

## Usuario de prueba (tras `db:seed`)

- **Email:** `admin@mini-proyecto-2-backend.com`
- **Contraseña:** `Admin1234!`

Solo para desarrollo; en producción rota credenciales y reglas de Firestore según tu modelo de amenazas.

## Despliegue (Render u otros)

- **Build:** `npm install && npm run build` (no hace falta `prisma generate`).
- Asegura `FIREBASE_SERVICE_ACCOUNT` o credenciales equivalentes en el entorno.
- Ejecuta `npm run db:seed` una vez (o desde tu pipeline) si la base está vacía.

## Licencia

ISC
