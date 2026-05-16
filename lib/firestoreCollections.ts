/** Nombres de colecciones en Firestore */
export const collections = {
  roles: "roles",
  permisos: "permisos",
  rolPermisos: "rolPermisos",
  usuarios: "usuarios",
  /** Documento id = username normalizado (minúsculas); campos: `{ uid: string }` */
  usernames: "usernames",
} as const;
