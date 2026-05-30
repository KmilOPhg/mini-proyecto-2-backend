const SOCKET_URL = process.env.SOCKET_SERVER_URL?.trim().replace(/\/$/, "") ?? "";
const API_KEY = process.env.INTERNAL_API_KEY?.trim() ?? "";

async function fetchSocketServer<T>(path: string): Promise<T | null> {
  if (!SOCKET_URL) return null;
  try {
    const res = await fetch(`${SOCKET_URL}${path}`, {
      headers: API_KEY ? { "x-internal-api-key": API_KEY } : {},
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type PresenciaResponse = {
  status: string;
  data: { salaId: string; count: number };
};

/** Consulta al servidor de Socket.io cuántos usuarios están en línea en una sala. */
export async function contarUsuariosEnLinea(salaId: string): Promise<number> {
  const data = await fetchSocketServer<PresenciaResponse>(
    `/internal/presencia/${encodeURIComponent(salaId)}/count`
  );
  return data?.data?.count ?? 0;
}
