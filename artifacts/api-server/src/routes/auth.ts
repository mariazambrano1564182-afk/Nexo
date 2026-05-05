import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.post("/auth/login", async (req: Request, res: Response) => {
  const { usuario, clave } = req.body;

  if (!usuario || !clave) {
    res.status(400).json({ error: "usuario y clave requeridos" });
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("username", usuario.trim())
    .single();

  if (error || !data) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  if (data.password_hash !== clave) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  // Map Supabase schema → app session format
  res.json({
    id:       data.id,
    _dbId:    data.id,
    nombre:   data.nombre_completo || data.username,
    usuario:  data.username,
    clave:    data.password_hash,
    comercio: data.comercio_id || "all",
    rol:      data.rol || "Operador",
    estado:   data.estado || "Activo",
    email:    data.email || "",
    vistas:   data.vistas || ["dashboard", "pos", "inventario", "clientes", "gastos", "reportes"],
    whatsapp: data.whatsapp || "",
  });
});

export default router;
