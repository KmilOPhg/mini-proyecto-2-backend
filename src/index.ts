import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./server.js";
import colors from "colors";

const port = process.env.PORT || 1206;

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(colors.cyan.bold(`Server listening on port ${port}`));
  });
}

start();
