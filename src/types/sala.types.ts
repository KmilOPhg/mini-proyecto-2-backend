import type { Timestamp } from "firebase-admin/firestore";

export type PrivacidadSala = "publica" | "enlace";

// Documento de sala en Firestore (`salas/{id}`)
export type SalaFirestore = {
  nombre: string;
  creadorUid: string;
  participantes: string[];
  codigoInvitacion?: string;
  aforoMaximo: number;
  privacidad: PrivacidadSala;
  materia?: string;
  descripcion?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// Sala pública para respuestas REST
export type SalaPublica = {
  id: string;
  nombre: string;
  creadorUid: string;
  participantes: string[];
  codigoInvitacion: string | null;
  aforoMaximo: number;
  privacidad: PrivacidadSala;
  materia: string | null;
  descripcion: string | null;
  esCreador: boolean;
  usuariosEnLinea: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CrearSalaInput = {
  nombre: string;
  codigoInvitacion: string;
};

// Resultado del dashboard de salas propias (US-06)
export type ListarMisSalasResultado = {
  items: SalaPublica[];
  total: number;
  vacio: boolean;
};

// Documento de mensaje en subcolección `salas/{id}/mensajes`
export type MensajeFirestore = {
  uid: string;
  username: string;
  texto: string;
  createdAt?: Timestamp;
};

// Mensaje público para REST y WebSocket
export type MensajePublico = {
  id: string;
  salaId: string;
  uid: string;
  username: string;
  texto: string;
  createdAt: string | null;
};
