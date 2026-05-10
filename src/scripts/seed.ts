import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";

// ─── Roles ───────────────────────────────────────────────────────────────────

async function seedRoles() {
  const roles = [
    { nombre: "admin", descripcion: "Administrador del sistema" },
    { nombre: "user", descripcion: "Usuario operativo" },
    { nombre: "cliente", descripcion: "Cliente externo" },
  ] as const;

  for (const r of roles) {
    await prisma.rol.upsert({
      where: { nombre: r.nombre },
      create: { nombre: r.nombre, descripcion: r.descripcion, activo: true },
      update: { descripcion: r.descripcion, activo: true },
    });
  }

  const result = await prisma.rol.findMany({ select: { id: true, nombre: true } });
  console.log("✔ Roles:");
  console.table(result);
  return result;
}

// ─── Rol Permiso ───────────────────────────────────────
async function seedRolPermisos() {
  const admin = await prisma.rol.findUnique({ where: { nombre: "admin" } });
  if (!admin) throw new Error("Rol admin no encontrado");

  const permisos = await prisma.permiso.findMany();
  for (const p of permisos) {
    await prisma.rolPermiso.upsert({
      where: { rolId_permisoId: { rolId: admin.id, permisoId: p.id } },
      create: { rolId: admin.id, permisoId: p.id },
      update: {},
    });
  }

  const total = await prisma.rolPermiso.count({ where: { rolId: admin.id } });
  console.log(`✔ RolPermiso: admin tiene ${total} permiso(s).`);
}

// ─── Permisos ────────────────────────────────────────────────────────────────
// Agregar permisos del proyecto aquí. Patrón: { codigo: "modulo.verbo", nombre, descripcion, modulo }

async function seedPermisos() {
  const permisos = [
    { codigo: "usuarios.crear", nombre: "Crear usuarios", descripcion: "POST /auth/register", modulo: "USUARIOS" },
    { codigo: "usuarios.consultar", nombre: "Consultar usuarios", descripcion: "GET /auth/users", modulo: "USUARIOS" },
    { codigo: "usuarios.actualizar", nombre: "Actualizar usuarios", descripcion: "PUT /auth/users/:id", modulo: "USUARIOS" },
    { codigo: "usuarios.deshabilitar", nombre: "Deshabilitar usuarios", descripcion: "PATCH disable", modulo: "USUARIOS" },
  ];

  for (const permiso of permisos) {
    await prisma.permiso.upsert({
      where: { codigo: permiso.codigo },
      create: permiso,
      update: permiso,
    });
  }

  const result = await prisma.permiso.findMany({ select: { id: true, codigo: true, modulo: true } });
  console.log("✔ Permisos:");
  console.table(result);
  return result;
}

// ─── Usuarios ────────────────────────────────────────────────────────────────

async function seedUsuarios(roles: { id: number; nombre: string }[]) {
  const rolAdmin = roles.find((r) => r.nombre === "admin")!.id;

  const usuarios = [
    { nombre: "Admin Principal", documento: "1000000001", email: "admin@mini-proyecto-2-backend.com", password: "Admin1234!", rolId: rolAdmin },
  ];

  for (const u of usuarios) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.usuario.upsert({
      where: { email: u.email },
      create: { nombre: u.nombre, documento: u.documento, email: u.email, passwordHash, rolId: u.rolId },
      update: { nombre: u.nombre, documento: u.documento, passwordHash, rolId: u.rolId },
    });
  }

  const result = await prisma.usuario.findMany({ select: { id: true, nombre: true, email: true } });
  console.log("✔ Usuarios:");
  console.table(result);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed...\n");
  const roles = await seedRoles();
  await seedPermisos();
  await seedRolPermisos();
  await seedUsuarios(roles);
  console.log("\n✅ Seed completado.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  });
