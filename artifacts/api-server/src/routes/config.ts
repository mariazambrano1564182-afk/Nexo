import { Router, type Request, type Response } from "express";

const router = Router();

router.get("/config", (req: Request, res: Response) => {
  let url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
  const anonKey = process.env["SUPABASE_ANON_KEY"] || process.env["VITE_SUPABASE_ANON_KEY"] || "";

  if (!url || !anonKey) {
    res.status(503).json({ error: "Supabase not configured" });
    return;
  }

  url = url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  res.json({ supabaseUrl: url, supabaseAnonKey: anonKey });
});

export default router;
