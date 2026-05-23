import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "mini-proyecto-2-backend API",
      version: "1.0.0",
      description: "Documentación de la API de mini-proyecto-2-backend",
    },
    tags: [
      {
        name: "Auth",
        description:
          "Autenticación estudiantil: Firebase Auth + perfil en Firestore (US-01 a US-03). El JWT del backend se obtiene en `POST /auth/session` o `POST /auth/google/complete-username` cuando el perfil está completo.",
      },
      {
        name: "Usuarios",
        description:
          "CRUD de perfiles en Firestore (`usuarios`). Requiere JWT del backend (`POST /auth/login` para admin o sesión estudiantil completa) y permisos `usuarios.*`.",
      },
    ],
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 1206}/api`,
        description: "Servidor local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Para `POST /auth/session` y `POST /auth/google/complete-username` enviar el **Firebase ID token**. Para rutas que usan `authenticateToken` del backend, el JWT devuelto en `data.token` tras sesión completa.",
        },
      },
      schemas: {
        ApiSuccessEnvelope: {
          type: "object",
          properties: {
            status: { type: "string", example: "success" },
            msg: { type: "string" },
            data: { description: "Carga útil; forma según el endpoint." },
          },
        },
        RegisterStudentBody: {
          type: "object",
          required: ["nombres", "apellidos", "username", "email", "password"],
          properties: {
            nombres: { type: "string", maxLength: 120 },
            apellidos: { type: "string", maxLength: 120 },
            username: {
              type: "string",
              description: "Único. 3–30 caracteres: minúsculas, números y guion bajo.",
            },
            avatar: {
              type: "string",
              format: "uri",
              nullable: true,
              description: "URL http(s); opcional.",
            },
            email: { type: "string", format: "email" },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
              description: "Al menos 8 caracteres, una letra y un número.",
            },
          },
        },
        RegisterStudentResponseData: {
          type: "object",
          properties: {
            customToken: {
              type: "string",
              description: "Token para `signInWithCustomToken` en el cliente Firebase.",
            },
            user: { $ref: "#/components/schemas/StudentUserPublic" },
          },
        },
        StudentUserPublic: {
          type: "object",
          properties: {
            id: { type: "string", description: "UID de Firebase / id del documento en `usuarios`." },
            nombres: { type: "string" },
            apellidos: { type: "string" },
            username: { type: "string", nullable: true },
            avatar: { type: "string", nullable: true },
            email: { type: "string" },
            rolId: { type: "string", example: "estudiante" },
            estado: { type: "string", enum: ["ACTIVO", "INACTIVO"] },
            profileComplete: { type: "boolean" },
          },
        },
        UsernameAvailableData: {
          type: "object",
          properties: {
            available: { type: "boolean" },
            username: { type: "string", description: "Username normalizado (minúsculas)." },
          },
        },
        SessionResponseData: {
          type: "object",
          required: ["needsUsername", "token", "user"],
          properties: {
            needsUsername: {
              type: "boolean",
              description: "Si es true, el usuario debe completar username (flujo Google).",
            },
            token: {
              type: "string",
              nullable: true,
              description:
                "JWT del backend (7 días) cuando el perfil está completo; `null` si aún falta elegir username.",
            },
            user: { $ref: "#/components/schemas/StudentUserPublic" },
          },
        },
        CompleteGoogleUsernameBody: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string" },
          },
        },
        CompleteGoogleUsernameData: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT del backend." },
            user: { $ref: "#/components/schemas/StudentUserPublic" },
          },
        },
        ApiErrorEnvelope: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            msg: { type: "string" },
            errors: { description: "Detalle opcional (p. ej. express-validator)." },
          },
        },
        LoginAdminBody: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
          },
        },
        LoginAdminData: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT del backend (7 días)." },
            user: { $ref: "#/components/schemas/UsuarioPublico" },
          },
        },
        UsuarioPublico: {
          type: "object",
          properties: {
            id: { type: "string" },
            tipo: { type: "string", enum: ["admin", "estudiante"] },
            nombre: { type: "string", nullable: true },
            nombres: { type: "string", nullable: true },
            apellidos: { type: "string", nullable: true },
            documento: { type: "string", nullable: true },
            username: { type: "string", nullable: true },
            avatar: { type: "string", nullable: true },
            email: { type: "string" },
            rolId: { type: "string" },
            estado: { type: "string", enum: ["ACTIVO", "INACTIVO"] },
            profileComplete: { type: "boolean" },
          },
        },
        CrearUsuarioAdminBody: {
          type: "object",
          required: ["nombre", "documento", "email", "password", "rolId"],
          properties: {
            nombre: { type: "string", maxLength: 200 },
            documento: { type: "string", maxLength: 30 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            rolId: { type: "string", example: "user" },
          },
        },
        ActualizarUsuarioBody: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            documento: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            rolId: { type: "string" },
            estado: { type: "string", enum: ["ACTIVO", "INACTIVO"] },
          },
        },
        ListarUsuariosData: {
          type: "object",
          properties: {
            items: { type: "array", items: { $ref: "#/components/schemas/UsuarioPublico" } },
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
          },
        },
      },
    },
    paths: {
      "/auth/login": {
        post: {
          tags: ["Usuarios"],
          summary: "Login administrativo (email + contraseña en Firestore)",
          description:
            "Para usuarios con `passwordHash` en Firestore (p. ej. `seed-admin` tras `db:seed`). Devuelve JWT del backend para rutas con `authenticateToken`.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginAdminBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Sesión iniciada.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/LoginAdminData" } },
                      },
                    ],
                  },
                },
              },
            },
            "401": {
              description: "Credenciales inválidas.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/auth/users": {
        get: {
          tags: ["Usuarios"],
          summary: "Listar usuarios",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "page", schema: { type: "integer", minimum: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { in: "query", name: "rolId", schema: { type: "string" } },
            { in: "query", name: "estado", schema: { type: "string", enum: ["ACTIVO", "INACTIVO"] } },
            { in: "query", name: "email", schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Listado paginado.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/ListarUsuariosData" } },
                      },
                    ],
                  },
                },
              },
            },
            "403": {
              description: "Sin permiso `usuarios.consultar`.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
        post: {
          tags: ["Usuarios"],
          summary: "Crear usuario administrativo",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CrearUsuarioAdminBody" },
              },
            },
          },
          responses: {
            "201": {
              description: "Usuario creado.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/UsuarioPublico" } },
                      },
                    ],
                  },
                },
              },
            },
            "403": {
              description: "Sin permiso `usuarios.crear`.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "409": {
              description: "Email o documento duplicado.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/auth/users/{id}": {
        get: {
          tags: ["Usuarios"],
          summary: "Obtener usuario por id",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Usuario encontrado.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/UsuarioPublico" } },
                      },
                    ],
                  },
                },
              },
            },
            "404": {
              description: "No encontrado.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
        put: {
          tags: ["Usuarios"],
          summary: "Actualizar usuario",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActualizarUsuarioBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Usuario actualizado.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/UsuarioPublico" } },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/auth/users/{id}/deshabilitar": {
        patch: {
          tags: ["Usuarios"],
          summary: "Deshabilitar usuario",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Usuario marcado como INACTIVO.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/UsuarioPublico" } },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Registro manual de estudiante (US-01)",
          description:
            "Crea el usuario en Firebase Auth, reserva el username en la colección `usernames` y guarda el perfil en Firestore (`usuarios/{uid}`). Requiere dominio institucional si `INSTITUTIONAL_EMAIL_DOMAINS` está configurado.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterStudentBody" },
              },
            },
          },
          responses: {
            "201": {
              description:
                "Cuenta creada. `data.customToken` para iniciar sesión en el cliente con `signInWithCustomToken`.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/RegisterStudentResponseData" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Validación de entrada o correo no institucional.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "409": {
              description: "Nombre de usuario o correo ya en uso.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/auth/username-available": {
        get: {
          tags: ["Auth"],
          summary: "Comprobar disponibilidad de username (US-01)",
          parameters: [
            {
              in: "query",
              name: "username",
              required: true,
              schema: { type: "string" },
              description: "Texto a validar y consultar (se normaliza a minúsculas).",
            },
          ],
          responses: {
            "200": {
              description: "`data.available` indica si está libre; `data.username` es el valor normalizado.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/UsernameAvailableData" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Formato de username inválido u otro error de validación.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/auth/session": {
        post: {
          tags: ["Auth"],
          summary: "Resolver sesión tras login con Firebase (US-02, US-03)",
          description:
            "Cabecera obligatoria: `Authorization: Bearer <Firebase ID token>`. Si es el primer acceso con Google, crea un perfil incompleto y devuelve `needsUsername: true` sin JWT de backend. Si el perfil está completo (username asignado), devuelve `needsUsername: false` y `token` (JWT) para el resto de la API.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Estado de sesión y perfil.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/SessionResponseData" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "401": {
              description: "Token de Firebase ausente o inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "403": {
              description: "Perfil no válido para flujo estudiante o cuenta inactiva.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Sin perfil en Firestore y el proveedor no es Google (p. ej. cuenta no registrada por esta API).",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/auth/google/complete-username": {
        post: {
          tags: ["Auth"],
          summary: "Completar username tras Google (US-02)",
          description:
            "Requiere `Authorization: Bearer <Firebase ID token>` de una sesión iniciada con Google. Completa el perfil y devuelve el JWT del backend.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompleteGoogleUsernameBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Perfil completado.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/CompleteGoogleUsernameData" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Validación, proveedor no Google o perfil ya completo.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "401": {
              description: "Token de Firebase ausente o inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Perfil de estudiante no encontrado.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "409": {
              description: "Nombre de usuario ya ocupado.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerDocument = swaggerJSDoc(options);
