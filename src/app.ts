import express from "express";
import router from "./routes/index.routes.js";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./docs/swagger.js";
import { origenPermitido } from "./utils/corsOrigins.js";

const app = express();

app.use(morgan("combined"));

const localOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
  "http://localhost:1206",
  "http://127.0.0.1:1206",
  "http://10.222.185.24:5173",
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (origenPermitido(origin, localOrigins)) return callback(null, true);
    return callback(new Error("No permitido por CORS"));
  },
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/api-docs.json", (_req, res) => {
  res.json(swaggerDocument);
});

app.use("/api", router);
app.use(errorMiddleware); // SIEMPRE al final
export default app;
