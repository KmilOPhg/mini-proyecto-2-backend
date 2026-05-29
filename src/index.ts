import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { connectDB } from "./server.js";
import { initSocketServer } from "./socket/index.js";
import colors from "colors";

const port = process.env.PORT || 1206;

async function start() {
  await connectDB();
  const httpServer = createServer(app);
  initSocketServer(httpServer);
  httpServer.listen(port, () => {
    console.log(colors.cyan.bold(`Server listening on port ${port}`));
    console.log(colors.cyan(`WebSocket (Socket.io) habilitado en el mismo puerto`));
  });
}

start();
