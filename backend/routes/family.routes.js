import express from "express";
import crypto from "crypto";
import { q } from "../db.js";
import { requireAuth, signToken } from "../auth.js";
import { formatUserRow } from "../utils/names.js";

const router = express.Router();
let ensuredFamilyNullable = false;

async function ensureFamilyNullable() {
  if (ensuredFamilyNullable) return;
  try {
    await q(`ALTER TABLE app_user ALTER COLUMN family_id DROP NOT NULL`);
  } catch (err) {
    if (!["42701", "42704"].includes(err?.code)) {
      console.error("ensure family nullable failed", err);
    }
  }
  ensuredFamilyNullable = true;
}

router.post("/", requireAuth, async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  try {
    await ensureFamilyNullable();
    const { rows: existing } = await q(
      `SELECT id, family_id, full_name, email
       FROM app_user
       WHERE id=$1`,
      [req.user.uid]
    );

    if (!existing.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRow = existing[0];
    if (userRow.family_id) {
      return res
        .status(409)
        .json({ error: "You already belong to a family. Leave it before creating another." });
    }

    const fallbackName = name || "New family workspace";

    const { rows: fam } = await q(
      `INSERT INTO family(name)
       VALUES($1)
       RETURNING id`,
      [fallbackName]
    );

    const familyId = fam[0].id;

    await q(
      `UPDATE app_user
       SET family_id=$1
       WHERE id=$2`,
      [familyId, req.user.uid]
    );

    const { rows: updatedUsers } = await q(
      `SELECT u.*, f.name AS family_name
       FROM app_user u
       LEFT JOIN family f ON u.family_id = f.id
       WHERE u.id=$1`,
      [req.user.uid]
    );

    const updatedUser = updatedUsers[0];
    const token = signToken(updatedUser);
    const user = formatUserRow(updatedUser);

    res.json({ user, token });
  } catch (e) {
    console.error("create family error", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/join", requireAuth, async (req, res) => {
  const tokenRaw = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const forceLeave = Boolean(req.body?.forceLeave);
  if (!tokenRaw) {
    return res.status(400).json({ error: "Invite token is required." });
  }

  try {
    await ensureFamilyNullable();
    const { rows: existing } = await q(
      `SELECT id, family_id, full_name, email
       FROM app_user
       WHERE id=$1`,
      [req.user.uid]
    );

    if (!existing.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRow = existing[0];

    const tokenHash = crypto.createHash("sha256").update(tokenRaw).digest("hex");
    const { rows: invites } = await q(
      `SELECT *
       FROM invite
       WHERE token_hash=$1
         AND used_at IS NULL
         AND expires_at > now()`,
      [tokenHash]
    );

    if (!invites.length) {
      return res.status(400).json({ error: "Invalid or expired invite" });
    }

    const invite = invites[0];
    const { rows: targetFamilies } = await q(
      `SELECT name FROM family WHERE id=$1`,
      [invite.family_id]
    );
    const targetFamilyName = targetFamilies[0]?.name ?? null;

    if (userRow.family_id) {
      if (userRow.family_id === invite.family_id) {
        await q(`UPDATE invite SET used_at=now() WHERE id=$1`, [invite.id]);
        const { rows: updatedUsers } = await q(
          `SELECT u.*, f.name AS family_name
           FROM app_user u
           LEFT JOIN family f ON u.family_id = f.id
           WHERE u.id=$1`,
          [req.user.uid]
        );
        const updatedUser = updatedUsers[0];
        const token = signToken(updatedUser);
        const user = formatUserRow(updatedUser);
        return res.json({ user, token });
      }

      if (!forceLeave) {
        const { rows: currentFamilyRows } = await q(
          `SELECT name FROM family WHERE id=$1`,
          [userRow.family_id]
        );
        return res.status(409).json({
          error: "You are already part of a family. Accepting will move you to a new family.",
          requiresLeave: true,
          currentFamily: currentFamilyRows[0]?.name ?? null,
          targetFamily: targetFamilyName,
        });
      }
    }

    await q(
      `UPDATE app_user
       SET family_id=$1
       WHERE id=$2`,
      [invite.family_id, req.user.uid]
    );

    await q(`UPDATE invite SET used_at=now() WHERE id=$1`, [invite.id]);

    const { rows: updatedUsers } = await q(
      `SELECT u.*, f.name AS family_name
       FROM app_user u
       LEFT JOIN family f ON u.family_id = f.id
       WHERE u.id=$1`,
      [req.user.uid]
    );

    const updatedUser = updatedUsers[0];
    const token = signToken(updatedUser);
    const user = formatUserRow(updatedUser);

    res.json({ user, token });
  } catch (e) {
    console.error("join family error", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
