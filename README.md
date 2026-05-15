# mini-proyecto-2-backend

API REST con **Node.js**, **TypeScript**, **Express**, **Prisma** (**MongoDB**, NoSQL) y documentación **Swagger**.

## Requisitos

- Node.js 20+ (recomendado)
- Instancia de **MongoDB** (local, Atlas u otro proveedor)

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Variables de entorno:

   ```bash
   cp .env.example .env
   ```

   En `DATABASE_URL` usa una URI válida de MongoDB, por ejemplo:

   - Local: `mongodb://USER:PASS@localhost:27017/NOMBRE_BD?authSource=admin`
   - Atlas: `mongodb+srv://USER:PASS@cluster.xxxxx.mongodb.net/NOMBRE_BD?retryWrites=true&w=majority`

   Ajusta también `JWT_SECRET`, y si aplica `FRONTEND_URL` y `PORT`.

3. Esquema en la base de datos y cliente Prisma:

   Prisma **no usa migraciones SQL** con MongoDB; se sincroniza el esquema con `db push`:

   ```bash
   npx prisma db push
   npx prisma generate
   ```

   El cliente queda en `node_modules/@prisma/client`. En Render u otro CI, el build suele ser: `npm install && npx prisma generate && npm run build`; aplica el esquema en el servidor con `npx prisma db push` cuando toque (o en un paso de release con `DATABASE_URL`).

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
| `npm run db:push` | Sincroniza `schema.prisma` con MongoDB (`prisma db push`) |
| `npm run db:migrate` | Alias de `db:push` (no hay migraciones SQL en Mongo) |
| `npm run db:seed` | Ejecuta el seeder |
| `npm run db:reset` | **Borra datos** y vuelve a aplicar el esquema (`db push --force-reset`) |
| `npm run db:reset:seed` | Reset + seed |
| `npm run deploy` | Solo `prisma db push` (ajusta en tu plataforma si necesitas seed u otros pasos) |

## Modelos e IDs

Los documentos usan **ObjectId** de MongoDB; en TypeScript y en el JWT se representan como **string** de 24 caracteres hex (`id` de usuario, `rolId`, etc.).

## Estructura principal

- `src/app.ts` — Express, CORS, Swagger, rutas y middleware de errores
- `src/routes/` — Definición de rutas y validaciones
- `src/controllers/` — Handlers HTTP (delegan en servicios)
- `src/services/` — Lógica de negocio y acceso a datos
- `src/middlewares/` — Autenticación JWT, permisos, validación, errores
- `src/utils/` — Utilidades compartidas (`AppError`, respuestas JSON, etc.)
- `lib/prisma.ts` — Cliente Prisma (singleton)
- `prisma/schema.prisma` — Modelos (MongoDB)
- `src/scripts/seed.ts` — Datos iniciales

## Usuario de prueba (tras `db:seed`)

Tras ejecutar el seed, existe un usuario administrador de ejemplo (solo para desarrollo; cámbialo o elimínalo en producción):

- **Email:** `admin@mini-proyecto-2-backend.com`
- **Contraseña:** `Admin1234!`

El rol `admin` queda vinculado a los permisos definidos en el seed para que encaje con `checkPermissions` en las rutas protegidas.

## Licencia

ISC
