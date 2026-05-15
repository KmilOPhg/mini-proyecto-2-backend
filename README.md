# mini-proyecto-2-backend

API REST con **Node.js**, **TypeScript**, **Express**, **Prisma** (PostgreSQL) y documentación **Swagger**.

## Requisitos

- Node.js 20+ (recomendado)
- PostgreSQL accesible localmente o en red

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Ajusta `DATABASE_URL`, `JWT_SECRET` y, si aplica, `FRONTEND_URL` y `PORT`.

3. Base de datos y cliente Prisma:

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

   El cliente se genera en `node_modules/@prisma/client` (salida por defecto), compatible con `npm run build` y con servicios como Render: el comando de build debe incluir `npx prisma generate` antes de `npm run build`.

4. Datos iniciales (roles, permisos, vínculos rol–permiso, usuario admin):

   ```bash
   npm run db:seed
   ```

5. Arranque en desarrollo:

   ```bash
   npm run dev
   ```

El servidor usa por defecto el puerto **1206** (configurable con `PORT`).

## Documentación OpenAPI

Con el servidor en marcha:

- Interfaz Swagger UI: [http://localhost:1206/api-docs](http://localhost:1206/api-docs)
- JSON: [http://localhost:1206/api-docs.json](http://localhost:1206/api-docs.json)

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor con recarga (`tsx watch`) |
| `npm run build` | Compila TypeScript y ajusta extensiones `.js` en `dist/` |
| `npm run prod` | Ejecuta el build (`node dist/src/index.js`) |
| `npm run typecheck` | Comprueba tipos sin emitir archivos |
| `npm run db:migrate` | Migraciones en desarrollo (`prisma migrate dev`) |
| `npm run db:seed` | Ejecuta el seeder |
| `npm run db:reset` | Resetea la BD (destructivo) |
| `npm run db:reset:seed` | Reset + seed |
| `npm run deploy` | Migraciones en producción + seed (ajusta según tu despliegue) |

## Estructura principal

- `src/app.ts` — Express, CORS, Swagger, rutas y middleware de errores
- `src/routes/` — Definición de rutas y validaciones
- `src/controllers/` — Handlers HTTP (delegan en servicios)
- `src/services/` — Lógica de negocio y acceso a datos
- `src/middlewares/` — Autenticación JWT, permisos, validación, errores
- `src/utils/` — Utilidades compartidas (`AppError`, respuestas JSON, etc.)
- `lib/prisma.ts` — Cliente Prisma (singleton)
- `prisma/schema.prisma` — Modelos y migraciones
- `src/scripts/seed.ts` — Datos iniciales

## Usuario de prueba (tras `db:seed`)

Tras ejecutar el seed, existe un usuario administrador de ejemplo (solo para desarrollo; cámbialo o elimínalo en producción):

- **Email:** `admin@mini-proyecto-2-backend.com`
- **Contraseña:** `Admin1234!`

El rol `admin` queda vinculado a los permisos definidos en el seed para que encaje con `checkPermissions` en las rutas protegidas.

## Licencia

ISC
