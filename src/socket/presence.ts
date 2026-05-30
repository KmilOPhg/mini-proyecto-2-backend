type PresenciaUsuario = {
  uid: string;
  nombre: string;
};

const presenciaPorSala = new Map<string, Map<string, PresenciaUsuario>>();

export function registrarPresencia(salaId: string, uid: string, nombre: string): PresenciaUsuario[] {
  let sala = presenciaPorSala.get(salaId);
  if (!sala) {
    sala = new Map();
    presenciaPorSala.set(salaId, sala);
  }
  sala.set(uid, { uid, nombre });
  return Array.from(sala.values());
}

export function quitarPresencia(salaId: string, uid: string): PresenciaUsuario[] {
  const sala = presenciaPorSala.get(salaId);
  if (!sala) return [];
  sala.delete(uid);
  if (sala.size === 0) {
    presenciaPorSala.delete(salaId);
    return [];
  }
  return Array.from(sala.values());
}

export function listarPresenciaSala(salaId: string): PresenciaUsuario[] {
  const sala = presenciaPorSala.get(salaId);
  return sala ? Array.from(sala.values()) : [];
}

export function contarUsuariosEnLinea(salaId: string): number {
  return presenciaPorSala.get(salaId)?.size ?? 0;
}

export function limpiarPresenciaSala(salaId: string): void {
  presenciaPorSala.delete(salaId);
}

export type { PresenciaUsuario };
