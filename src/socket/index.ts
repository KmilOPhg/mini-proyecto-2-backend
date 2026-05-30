import colors from "colors";

const SOCKET_URL = process.env.SOCKET_SERVER_URL?.trim().replace(/\/$/, "") ?? "";
const API_KEY = process.env.INTERNAL_API_KEY?.trim() ?? "";

/**
 * Notifica al servidor de Socket.io que la sala fue terminada.
 * Fire-and-forget: no bloquea la respuesta HTTP del backend.
 */
export function notificarSalaTerminada(
  salaId: string,
  mensaje = "El anfitrión terminó la sesión."
): void {
  if (!SOCKET_URL) {
    console.warn(
      colors.yellow(
        "[Socket] SOCKET_SERVER_URL no configurada — notificarSalaTerminada omitido."
      )
    );
    return;
  }
  fetch(`${SOCKET_URL}/internal/notificar-sala-terminada`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "x-internal-api-key": API_KEY } : {}),
    },
    body: JSON.stringify({ salaId, mensaje }),
  }).catch((err: unknown) => {
    console.error(
      colors.red("[Socket] Error al notificar sala terminada:"),
      err instanceof Error ? err.message : err
    );
  });
}
