import express from 'express';
import { q } from '../db.js';
import { requireAuth } from '../auth.js';

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
    res.json(rows);
  } catch (e) {
    console.error('list users error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
