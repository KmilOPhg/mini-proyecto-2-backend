/** Nombres de colecciones en Firestore */
export const collections = {
  roles: "roles",
  permisos: "permisos",
  rolPermisos: "rolPermisos",
  usuarios: "usuarios",
  /** Documento id = username normalizado (minúsculas); campos: `{ uid: string }` */
  usernames: "usernames",
  /** Salas de estudio; id autogenerado por Firestore */
  salas: "salas",
  /** Subcolección bajo `salas/{salaId}/mensajes` */
  mensajes: "mensajes",
} as const;
