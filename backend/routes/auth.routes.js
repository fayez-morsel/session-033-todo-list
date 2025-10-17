import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { q } from "../db.js";
import { signToken } from "../auth.js";
import { splitFullName, formatUserRow } from "../utils/names.js";

const router = express.Router();

/**
 * POST /auth/register
 */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (!trimmedName || !trimmedEmail || !password)
    return res.status(400).json({ error: "Missing fields" });

  const { firstName } = splitFullName(trimmedName);
  const fallbackName =
    firstName || trimmedName || (trimmedEmail.includes("@") ? trimmedEmail.split("@")[0] : "");
  const familyLabel = `${fallbackName}'s family`;

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await q(
      `WITH new_family AS (
         INSERT INTO family(name)
         VALUES($1)
         RETURNING id
       )
       INSERT INTO app_user(family_id, email, full_name, password_hash)
       SELECT id, $2, $3, $4 FROM new_family
       RETURNING id, family_id, email, full_name`,
      [familyLabel, trimmedEmail.toLowerCase(), trimmedName, hash]
    );

    const dbUser = rows[0];
    const token = signToken(dbUser);
    const user = formatUserRow(dbUser);
    res.json({ user, token });
  } catch (e) {
    if (e?.code === "23505") {
      return res.status(409).json({ error: "Email in use" });
    }
    console.error("signup error", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /auth/login
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!trimmedEmail || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const { rows } = await q("SELECT * FROM app_user WHERE email=$1", [trimmedEmail]);
    if (!rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    delete user.password_hash;
    const responseUser = formatUserRow(user);
    res.json({ user: responseUser, token });
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
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!token || !trimmedName || !trimmedEmail || !password)
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

    const inviteNameParts = splitFullName(trimmedName);
    const inviteFamily = (inviteNameParts.familyName || "").trim();
    if (!inviteFamily) {
      return res
        .status(400)
        .json({ error: "Please include your family name to join this family." });
    }

    const { rows: owners } = await q(
      `SELECT full_name
       FROM app_user
       WHERE family_id=$1
       ORDER BY created_at ASC
       LIMIT 1`,
      [inv.family_id]
    );
    if (owners.length) {
      const ownerParts = splitFullName(owners[0].full_name || "");
      const ownerFamily = (ownerParts.familyName || "").trim();
      if (
        ownerFamily &&
        ownerFamily.toLowerCase() !== inviteFamily.toLowerCase()
      ) {
        return res
          .status(403)
          .json({ error: "Family name does not match this family." });
      }
    }

    const { rows: existing } = await q(
      "SELECT 1 FROM app_user WHERE email=$1",
      [trimmedEmail]
    );
    if (existing.length) return res.status(409).json({ error: "Email in use" });

    const hash = await bcrypt.hash(password, 10);
    const { rows: usr } = await q(
      `INSERT INTO app_user(family_id, email, full_name, password_hash)
       VALUES($1,$2,$3,$4)
       RETURNING id, family_id, email, full_name`,
      [inv.family_id, trimmedEmail, trimmedName, hash]
    );

    await q("UPDATE invite SET used_at=now() WHERE id=$1", [inv.id]);

    const dbUser = usr[0];
    const jwt = signToken(dbUser);
    const responseUser = formatUserRow(dbUser);
    res.json({ user: responseUser, token: jwt });
  } catch (e) {
    if (e?.code === "23505") {
      return res.status(409).json({ error: "Email in use" });
    }
    console.error("accept-invite error", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
