import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "mini-proyecto-2-backend API",
      version: "1.0.0",
      description: "Documentación de la API de mini-proyecto-2-backend",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 1206}/api`,
        description: "Servidor local",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/docs/*.ts"],
};

export const swaggerDocument = swaggerJSDoc(options);
