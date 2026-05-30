import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./server.js";
import colors from "colors";

const port = process.env.PORT || 1206;

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(colors.cyan.bold(`Server listening on port ${port}`));
    const socketUrl = process.env.SOCKET_SERVER_URL;
    if (socketUrl) {
      console.log(colors.cyan(`Socket server externo: ${socketUrl}`));
    } else {
      console.log(colors.yellow(`[Aviso] SOCKET_SERVER_URL no configurada. notificarSalaTerminada y presencia deshabilitados.`));
    }
  });
}

start();
