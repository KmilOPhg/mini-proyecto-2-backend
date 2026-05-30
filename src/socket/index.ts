import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import * as salaService from "../services/sala.service.js";
import { AppError } from "../utils/AppError.js";
import {
  limpiarPresenciaSala,
  listarPresenciaSala,
  quitarPresencia,
  registrarPresencia,
} from "./presence.js";
import { socketRoomName, verifySocketJwt } from "./auth.js";

type SocketData = {
  uid: string;
  nombre: string;
};

let ioInstance: Server | null = null;

/** Notifica a todos los conectados y limpia presencia cuando se elimina la sala. */
export function notificarSalaTerminada(
  salaId: string,
  mensaje = "El anfitrión terminó la sesión."
): void {
  if (!ioInstance) return;
  const room = socketRoomName(salaId);
  ioInstance.to(room).emit("sala:terminada", { salaId, mensaje });
  limpiarPresenciaSala(salaId);
  void ioInstance.in(room).socketsLeave(room);
}

function normalizarOrigen(valor?: string): string {
  return (valor || "").replace(/\/$/, "").toLowerCase();
}

function obtenerOrigenesPermitidos(): string[] {
  return [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:1206",
    "http://127.0.0.1:1206",
  ]
    .filter(Boolean)
    .map((origen) => normalizarOrigen(origen));
}

function emitirPresencia(io: Server, salaId: string): void {
  const lista = listarPresenciaSala(salaId);
  io.to(socketRoomName(salaId)).emit("presencia:actualizada", { salaId, usuarios: lista });
}

function obtenerErrorMensaje(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) return err.message;
  return "Error inesperado en el servidor.";
}

// Inicializar Socket.io para salas y chat (TS-02)
export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const permitidos = new Set(obtenerOrigenesPermitidos());
        if (permitidos.has(normalizarOrigen(origin))) return callback(null, true);
        return callback(new Error("No permitido por CORS"));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token) ||
        (typeof socket.handshake.headers.authorization === "string" &&
          socket.handshake.headers.authorization.startsWith("Bearer ")
          ? socket.handshake.headers.authorization.slice(7)
          : "");

      if (!token) {
        return next(new Error("Token no proporcionado."));
      }

      const user = verifySocketJwt(token);
      socket.data = { uid: user.id, nombre: user.nombre } satisfies SocketData;
      next();
    } catch (err) {
      next(new Error(obtenerErrorMensaje(err)));
    }
  });

  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;
    const salasActivas = new Set<string>();

    socket.on("sala:unirse", async (payload: { salaId?: string }, ack?: (res: unknown) => void) => {
      try {
        const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
        if (!salaId) {
          throw new AppError("El id de la sala es obligatorio.", 400);
        }

        await salaService.verificarAccesoSala(salaId, data.uid);
        await socket.join(socketRoomName(salaId));
        salasActivas.add(salaId);
        const nombre = await salaService.obtenerNombreVisible(data.uid);
        data.nombre = nombre;
        registrarPresencia(salaId, data.uid, nombre);
        emitirPresencia(io, salaId);

        ack?.({ ok: true, salaId });
      } catch (err) {
        ack?.({ ok: false, error: obtenerErrorMensaje(err) });
      }
    });

    socket.on("perfil:actualizar", async (ack?: (res: unknown) => void) => {
      try {
        const nombre = await salaService.obtenerNombreVisible(data.uid);
        data.nombre = nombre;
        for (const salaId of salasActivas) {
          registrarPresencia(salaId, data.uid, nombre);
          emitirPresencia(io, salaId);
        }
        ack?.({ ok: true, nombre });
      } catch (err) {
        ack?.({ ok: false, error: obtenerErrorMensaje(err) });
      }
    });

    socket.on("sala:salir", (payload: { salaId?: string }) => {
      const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
      if (!salaId) return;
      socket.leave(socketRoomName(salaId));
      salasActivas.delete(salaId);
      quitarPresencia(salaId, data.uid);
      emitirPresencia(io, salaId);
    });

    socket.on(
      "mensaje:enviar",
      async (
        payload: { salaId?: string; texto?: string },
        ack?: (res: unknown) => void
      ) => {
        try {
          const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
          const texto = typeof payload?.texto === "string" ? payload.texto : "";
          if (!salaId) {
            throw new AppError("El id de la sala es obligatorio.", 400);
          }

          const mensaje = await salaService.guardarMensaje(salaId, data.uid, texto);
          io.to(socketRoomName(salaId)).emit("mensaje:nuevo", mensaje);
          ack?.({ ok: true, mensaje });
        } catch (err) {
          ack?.({ ok: false, error: obtenerErrorMensaje(err) });
        }
      }
    );

    socket.on("disconnect", () => {
      for (const salaId of salasActivas) {
        quitarPresencia(salaId, data.uid);
        emitirPresencia(io, salaId);
      }
    });
  });

  ioInstance = io;
  return io;
}
