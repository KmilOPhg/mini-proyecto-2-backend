import "dotenv/config";
import bcrypt from "bcrypt";
import { getDb, getFirebaseApp } from "../../lib/firebase.js";
import { collections } from "../../lib/firestoreCollections.js";

getFirebaseApp();

/** Borra todos los documentos de una colección (lotes de 400 por límite de batch). */
async function deleteAllDocs(collectionName: string) {
  const db = getDb();
  const snap = await db.collection(collectionName).get();
  if (snap.empty) return;

  let batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    n++;
    if (n >= 400) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}

/** Orden: primero enlaces y usuarios, luego catálogos. */
async function clearSeedCollections() {
  await deleteAllDocs(collections.rolPermisos);
  await deleteAllDocs(collections.usernames);
  await deleteAllDocs(collections.usuarios);
  await deleteAllDocs(collections.permisos);
  await deleteAllDocs(collections.roles);
  console.log("🗑 Colecciones de seed vaciadas.\n");
}

// ─── Roles ───────────────────────────────────────────────────────────────────

async function seedRoles() {
  const col = getDb().collection(collections.roles);
  const list = [
    { id: "admin", nombre: "admin", descripcion: "Administrador del sistema" },
    { id: "user", nombre: "user", descripcion: "Usuario operativo" },
    { id: "cliente", nombre: "cliente", descripcion: "Cliente externo" },
    { id: "estudiante", nombre: "estudiante", descripcion: "Estudiante de la plataforma (Firebase Auth)" },
  ] as const;

  for (const r of list) {
    await col.doc(r.id).set({ nombre: r.nombre, descripcion: r.descripcion, activo: true });
  }

  const snap = await col.get();
  const result = snap.docs.map((d) => ({ id: d.id, nombre: (d.data().nombre as string) ?? d.id }));
  console.log("✔ Roles:");
  console.table(result);
  return result;
}

// ─── Permisos ────────────────────────────────────────────────────────────────

async function seedPermisos() {
  const col = getDb().collection(collections.permisos);
  const permisos = [
    { codigo: "usuarios.crear", nombre: "Crear usuarios", descripcion: "POST /auth/register", modulo: "USUARIOS" },
    { codigo: "usuarios.consultar", nombre: "Consultar usuarios", descripcion: "GET /auth/users", modulo: "USUARIOS" },
    { codigo: "usuarios.actualizar", nombre: "Actualizar usuarios", descripcion: "PUT /auth/users/:id", modulo: "USUARIOS" },
    { codigo: "usuarios.deshabilitar", nombre: "Deshabilitar usuarios", descripcion: "PATCH disable", modulo: "USUARIOS" },
  ];

  for (const p of permisos) {
    await col.doc(p.codigo).set({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      modulo: p.modulo,
    });
  }

  const snap = await col.get();
  const result = snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, codigo: data.codigo as string, modulo: data.modulo as string };
  });
  console.log("✔ Permisos:");
  console.table(result);
  return result;
}

// ─── Rol ↔ permiso ───────────────────────────────────────────────────────────

function rolPermisoDocId(rolId: string, permisoCodigo: string) {
  return `${rolId}__${encodeURIComponent(permisoCodigo)}`;
}

async function seedRolPermisos() {
  const adminId = "admin";
  const adminSnap = await getDb().collection(collections.roles).doc(adminId).get();
  if (!adminSnap.exists) throw new Error("Rol admin no encontrado");

  const permisosSnap = await getDb().collection(collections.permisos).get();
  const col = getDb().collection(collections.rolPermisos);

  for (const doc of permisosSnap.docs) {
    const codigo = doc.data().codigo as string;
    await col.doc(rolPermisoDocId(adminId, codigo)).set({ rolId: adminId, permisoCodigo: codigo });
  }

  const links = await col.where("rolId", "==", adminId).get();
  console.log(`✔ RolPermiso: admin tiene ${links.size} permiso(s).`);
}

// ─── Usuarios ────────────────────────────────────────────────────────────────

const SEED_ADMIN_USER_DOC_ID = "seed-admin";

async function seedUsuarios(roles: { id: string; nombre: string }[]) {
  const rolAdmin = roles.find((r) => r.nombre === "admin")!.id;
  const col = getDb().collection(collections.usuarios);

  const u = {
    nombre: "Admin Principal",
    documento: "1000000001",
    email: "admin@admin.com",
    password: "Admin1234!",
    rolId: rolAdmin,
  };

  const passwordHash = await bcrypt.hash(u.password, 10);
  await col.doc(SEED_ADMIN_USER_DOC_ID).set({
    nombre: u.nombre,
    documento: u.documento,
    email: u.email,
    passwordHash,
    rolId: u.rolId,
    estado: "ACTIVO",
  });

  const doc = await col.doc(SEED_ADMIN_USER_DOC_ID).get();
  const data = doc.data()!;
  const result = [{ id: doc.id, nombre: data.nombre as string, email: data.email as string }];
  console.log("✔ Usuarios:");
  console.table(result);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seed: se borran las colecciones y se vuelve a insertar todo.\n");
  await clearSeedCollections();
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
