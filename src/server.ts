import colors from "colors";
import { getFirebaseApp } from "../lib/firebase.js";

export async function connectDB() {
  try {
    getFirebaseApp();
    console.log(colors.bgGreen.bold("Firebase Admin / Firestore listo"));
  } catch (err) {
    console.error(err);
    console.log(colors.red.bold("Error al inicializar Firebase"));
  }
}
