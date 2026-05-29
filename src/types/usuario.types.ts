import type { Timestamp } from "firebase-admin/firestore";

export type EstadoUsuario = "ACTIVO" | "INACTIVO";

// Perfil administrativo en `usuarios` (sin Firebase Auth)
export type UsuarioAdminFirestore = {
  nombre: string;
  documento: string;
  email: string;
  passwordHash: string;
  rolId: string;
  estado?: EstadoUsuario;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type UsuarioAdminCreate = {
  nombre: string;
  documento: string;
  email: string;
  password: string;
  rolId: string;
};

export type UsuarioAdminUpdate = Partial<{
  nombre: string;
  documento: string;
  email: string;
  password: string;
  rolId: string;
  estado: EstadoUsuario;
}>;

export type UsuarioPublico = {
  id: string;
  tipo: "admin" | "estudiante";
  nombre: string | null;
  nombres: string | null;
  apellidos: string | null;
  documento: string | null;
  username: string | null;
  avatar: string | null;
  email: string;
  rolId: string;
  estado: EstadoUsuario;
  profileComplete?: boolean;
};

export type ListarUsuariosFiltros = {
  page?: number | string;
  limit?: number | string;
  rolId?: string;
  estado?: EstadoUsuario;
  email?: string;
};

export type ListarUsuariosResultado = {
  items: UsuarioPublico[];
  total: number;
  page: number;
  limit: number;
};

export type LoginAdminInput = {
  email: string;
  password: string;
};

export type LoginAdminResultado = {
  token: string;
  user: UsuarioPublico;
};

// Actualización de perfil del estudiante autenticado (US-04)
export type EstudiantePerfilUpdate = Partial<{
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string | null;
  email: string;
}>;
