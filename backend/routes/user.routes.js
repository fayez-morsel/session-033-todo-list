import express from 'express';
import { q } from '../db.js';
import { requireAuth } from '../auth.js';
import { splitFullName } from '../utils/names.js';

const router = express.Router();

/**
 * GET /users
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await q(
      'SELECT id, full_name, email FROM app_user WHERE family_id=$1 ORDER BY full_name',
      [req.user.fid]
    );
    const { rows: ownerRows } = await q(
      'SELECT id FROM app_user WHERE family_id=$1 ORDER BY created_at ASC LIMIT 1',
      [req.user.fid]
    );
    const ownerId = ownerRows[0]?.id;

    const formatted = rows.map((row) => {
      const { firstName, familyName } = splitFullName(row.full_name);
      const fallback =
        row.full_name?.trim() ||
        (row.email?.includes('@') ? row.email.split('@')[0] : '');
      return {
        id: row.id,
        email: row.email,
        full_name: row.full_name ?? fallback,
        fullName: row.full_name?.trim() || fallback,
        firstName: firstName || fallback,
        familyName: familyName || undefined,
        role: row.id === ownerId ? 'owner' : 'member',
      };
    });
    res.json(formatted);
  } catch (e) {
    console.error('list users error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /users/me
 */
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await q(
      'DELETE FROM app_user WHERE id=$1 RETURNING id',
      [req.user.uid]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('leave family error', e);
    if (e?.code === '23503') {
      return res.status(409).json({ error: 'Cannot leave family while assigned to active records' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
