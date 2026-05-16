import type { Timestamp } from "firebase-admin/firestore";

/** Perfil de estudiante en `usuarios` (id de documento = Firebase Auth UID). */
export type StudentUsuarioFirestore = {
  firebaseUid: string;
  nombres: string;
  apellidos: string;
  /** Texto canónico en minúsculas; coincide con reserva en `usernames`. */
  username: string | null;
  usernameNormalized: string | null;
  avatar: string | null;
  email: string;
  rolId: string;
  estado: "ACTIVO" | "INACTIVO";
  profileComplete: boolean;
  authProviders: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// Perfil publico de un usuario estudiante
export type StudentUserPublic = {
  id: string;
  nombres: string;
  apellidos: string;
  username: string | null;
  avatar: string | null;
  email: string;
  rolId: string;
  estado: "ACTIVO" | "INACTIVO";
  profileComplete: boolean;
};
