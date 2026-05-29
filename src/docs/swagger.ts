import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "mini-proyecto-2-backend API",
      version: "1.1.0",
      description:
        "API REST + Socket.io para mini-proyecto-2. Cubre US-01 a US-07 y base TS-02 (salas, chat, presencia). " +
        "Swagger UI: `/api-docs`. JSON: `/api-docs.json`.",
    },
    tags: [
      {
        name: "Auth",
        description:
          "Registro y sesión estudiantil con Firebase (US-01 a US-03). En `POST /auth/session` y `POST /auth/google/complete-username` usar el **Firebase ID token**. El **JWT del backend** (7 días) se devuelve en `data.token` cuando el perfil está completo.",
      },
      {
        name: "Perfil",
        description:
          "Perfil del estudiante autenticado (US-04, US-05). Requiere **JWT del backend** (`data.token` tras sesión completa). Rol `estudiante`, estado `ACTIVO`. No requiere permisos `usuarios.*`.",
      },
      {
        name: "Usuarios",
        description:
          "Administración de usuarios en Firestore. Requiere JWT del backend (`POST /auth/login` para admin) y permisos `usuarios.*`.",
      },
      {
        name: "Salas",
        description:
          "Salas de estudio (US-06, US-07) y mensajes (TS-02). JWT del backend, rol `estudiante`. " +
          "**WebSocket (mismo puerto):** conectar con Socket.io y `auth: { token: '<JWT backend>' }`. " +
          "Eventos cliente→servidor: `sala:unirse`, `sala:salir`, `mensaje:enviar`. " +
          "Eventos servidor→cliente: `mensaje:nuevo`, `presencia:actualizada`.",
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
            "JWT del backend (7 días), obtenido en `POST /auth/session` (perfil completo), `POST /auth/google/complete-username` o `POST /auth/login` (admin).",
        },
        firebaseIdToken: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Firebase ID token del cliente tras `signInWithCustomToken`, email/contraseña o Google. Solo en rutas marcadas explícitamente.",
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
        SalaPublica: {
          type: "object",
          properties: {
            id: { type: "string" },
            nombre: { type: "string" },
            creadorUid: { type: "string" },
            participantes: { type: "array", items: { type: "string" } },
            esCreador: { type: "boolean" },
            createdAt: { type: "string", format: "date-time", nullable: true },
            updatedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        ListarMisSalasData: {
          type: "object",
          properties: {
            items: { type: "array", items: { $ref: "#/components/schemas/SalaPublica" } },
            total: { type: "integer" },
            vacio: { type: "boolean" },
          },
        },
        CrearSalaBody: {
          type: "object",
          required: ["nombre"],
          properties: {
            nombre: { type: "string", minLength: 3, maxLength: 80 },
          },
        },
        MensajePublico: {
          type: "object",
          properties: {
            id: { type: "string" },
            salaId: { type: "string" },
            uid: { type: "string" },
            username: { type: "string" },
            texto: { type: "string" },
            createdAt: { type: "string", format: "date-time", nullable: true },
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
        ActualizarMiPerfilBody: {
          type: "object",
          description: "Todos los campos son opcionales; enviar solo los que se desean cambiar.",
          properties: {
            nombres: { type: "string", maxLength: 120 },
            apellidos: { type: "string", maxLength: 120 },
            username: {
              type: "string",
              description: "3–30 caracteres: minúsculas, números y guion bajo. 409 si ya está en uso.",
            },
            avatar: {
              type: "string",
              format: "uri",
              nullable: true,
              description: "URL http(s); `null` o vacío para quitar avatar.",
            },
            email: {
              type: "string",
              format: "email",
              description: "Dominio institucional si `INSTITUTIONAL_EMAIL_DOMAINS` está configurado. 409 si duplicado.",
            },
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
      "/auth/users/me": {
        get: {
          tags: ["Perfil"],
          summary: "Ver mi perfil (US-04)",
          description: "Devuelve el perfil del estudiante autenticado (`usuarios/{uid}`).",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Perfil obtenido.",
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
            "401": {
              description: "Token ausente o inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "403": {
              description: "No es estudiante o cuenta inactiva.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Perfil no encontrado.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
        put: {
          tags: ["Perfil"],
          summary: "Editar mi perfil (US-04)",
          description:
            "Actualiza Firestore, reserva de `usernames` (transacción) y sincroniza Firebase Auth (`displayName`, `photoURL`, `email`).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActualizarMiPerfilBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Perfil actualizado.",
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
            "400": {
              description: "Validación o sin campos para actualizar.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "401": {
              description: "Token ausente o inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "403": {
              description: "No es estudiante o cuenta inactiva.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "409": {
              description: "Username o correo ya registrado.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
        delete: {
          tags: ["Perfil"],
          summary: "Eliminar mi cuenta (US-05)",
          description:
            "Borra el documento en `usuarios`, libera `usernames` y elimina el usuario en Firebase Auth. El cliente debe cerrar sesión y redirigir al login.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Cuenta eliminada (`data` es null).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                },
              },
            },
            "401": {
              description: "Token ausente o inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "403": {
              description: "No es estudiante.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Perfil no encontrado.",
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
          security: [{ firebaseIdToken: [] }],
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
          security: [{ firebaseIdToken: [] }],
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
      "/salas/mias": {
        get: {
          tags: ["Salas"],
          summary: "Listar mis salas (US-06)",
          description:
            "Salas donde el usuario autenticado es `creadorUid`. Si `data.vacio` es true, el mensaje de la API invita a crear la primera sala.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Dashboard de salas propias.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/ListarMisSalasData" } },
                      },
                    ],
                  },
                },
              },
            },
            "401": {
              description: "Token ausente o inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "403": {
              description: "No es estudiante o cuenta inactiva.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/salas": {
        post: {
          tags: ["Salas"],
          summary: "Crear sala (US-06)",
          description:
            "Genera un ID único en Firestore. El creador queda en `participantes` y `esCreador: true` en la respuesta.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CrearSalaBody" } },
            },
          },
          responses: {
            "201": {
              description: "Sala creada.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/SalaPublica" } },
                      },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Nombre inválido (3–80 caracteres).",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "401": {
              description: "Token ausente o inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "403": {
              description: "No es estudiante.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/salas/{id}": {
        get: {
          tags: ["Salas"],
          summary: "Obtener sala",
          description: "Acceso para creador o participante. Incluye `esCreador` para UI (US-07).",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Detalle de sala.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/SalaPublica" } },
                      },
                    ],
                  },
                },
              },
            },
            "403": {
              description: "Sin acceso a la sala.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Sala no encontrada.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
        put: {
          tags: ["Salas"],
          summary: "Editar nombre de sala (US-07)",
          description: "Solo el `creadorUid` puede editar. Participantes reciben 403.",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CrearSalaBody" } },
            },
          },
          responses: {
            "200": {
              description: "Sala actualizada.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/SalaPublica" } },
                      },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Nombre inválido.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "403": {
              description: "Solo el creador puede editar.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Sala no encontrada.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
        delete: {
          tags: ["Salas"],
          summary: "Eliminar sala (US-07)",
          description: "Elimina la sala y todos los mensajes de la subcolección. Solo el creador.",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Sala eliminada (`data` es null).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                },
              },
            },
            "403": {
              description: "Solo el creador puede eliminar.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Sala no encontrada.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/salas/{id}/unirse": {
        post: {
          tags: ["Salas"],
          summary: "Unirse a sala por ID (TS-02)",
          description: "Valida que la sala exista y agrega el UID a `participantes` si aún no tiene acceso.",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Unión exitosa (o ya era participante).",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: { data: { $ref: "#/components/schemas/SalaPublica" } },
                      },
                    ],
                  },
                },
              },
            },
            "404": {
              description: "Sala no encontrada.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
          },
        },
      },
      "/salas/{id}/mensajes": {
        get: {
          tags: ["Salas"],
          summary: "Historial de mensajes (TS-02)",
          description: "Últimos mensajes ordenados por antigüedad ascendente. Por defecto `limit=50`.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            },
          ],
          responses: {
            "200": {
              description: "Mensajes recientes.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiSuccessEnvelope" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/MensajePublico" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "403": {
              description: "Sin acceso a la sala.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ApiErrorEnvelope" } },
              },
            },
            "404": {
              description: "Sala no encontrada.",
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
