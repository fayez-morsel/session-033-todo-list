import express from 'express';
import crypto from 'crypto';
import { q } from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

/**
 * POST /invites
 */
router.post('/', requireAuth, async (req, res) => {
  const { expiresInHours = 72 } = req.body || {};
  const raw = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

  try {
    const { rows } = await q(
      `INSERT INTO invite(family_id, token_hash, created_by, expires_at)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [req.user.fid, tokenHash, req.user.uid, expiresAt]
    );
    res.json({ token: raw, inviteId: rows[0].id, expiresAt });
  } catch (e) {
    console.error('create invite error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
