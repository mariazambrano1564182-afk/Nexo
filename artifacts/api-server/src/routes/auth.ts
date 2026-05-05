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
    .eq("usuario", usuario.trim())
    .eq("estado", "Activo")
    .single();

  if (error || !data) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  if (data.clave !== clave) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  res.json(data);
});

export default router;
