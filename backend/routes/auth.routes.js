import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { q } from "../db.js";
import { signToken } from "../auth.js";

const router = express.Router();

/**
 * POST /auth/signup
 */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const { rows: existing } = await q(
      "SELECT 1 FROM app_user WHERE email=$1",
      [email]
    );
    if (existing.length) return res.status(409).json({ error: "Email in use" });

    const { rows: fam } = await q(
      "INSERT INTO family(name) VALUES($1) RETURNING id",
      [`${name.split(" ")[0]}'s family`]
    );
    const familyId = fam[0].id;

    const hash = await bcrypt.hash(password, 10);
    const { rows: usr } = await q(
      `INSERT INTO app_user(family_id, email, full_name, password_hash)
       VALUES($1,$2,$3,$4)
       RETURNING id, family_id, email, full_name`,
      [familyId, email, name, hash]
    );

    const token = signToken(usr[0]);
    res.json({ user: usr[0], token });
  } catch (e) {
    console.error("signup error", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /auth/login
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const { rows } = await q("SELECT * FROM app_user WHERE email=$1", [email]);
    if (!rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    delete user.password_hash;
    res.json({ user, token });
  } catch (e) {
    console.error("login error", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /auth/accept-invite
 */
router.post("/accept-invite", async (req, res) => {
  const { token, name, email, password } = req.body;
  if (!token || !name || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { rows: invs } = await q(
      `SELECT * FROM invite
       WHERE token_hash=$1
         AND used_at IS NULL
         AND expires_at > now()`,
      [tokenHash]
    );
    if (!invs.length)
      return res.status(400).json({ error: "Invalid or expired invite" });
    const inv = invs[0];

    const { rows: existing } = await q(
      "SELECT 1 FROM app_user WHERE email=$1",
      [email]
    );
    if (existing.length) return res.status(409).json({ error: "Email in use" });

    const hash = await bcrypt.hash(password, 10);
    const { rows: usr } = await q(
      `INSERT INTO app_user(family_id, email, full_name, password_hash)
       VALUES($1,$2,$3,$4)
       RETURNING id, family_id, email, full_name`,
      [inv.family_id, email, name, hash]
    );

    await q("UPDATE invite SET used_at=now() WHERE id=$1", [inv.id]);

    const jwt = signToken(usr[0]);
    res.json({ user: usr[0], token: jwt });
  } catch (e) {
    console.error("accept-invite error", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
