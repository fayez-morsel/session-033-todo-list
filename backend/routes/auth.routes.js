import express from 'express';
import bcrypt from 'bcrypt';
import { q } from '../db.js';
import { signToken } from '../auth.js';

const router = express.Router();

/**
 * POST /auth/signup
 */
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    const { rows: existing } = await q('SELECT 1 FROM app_user WHERE email=$1', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email in use' });

    const { rows: fam } = await q(
      'INSERT INTO family(name) VALUES($1) RETURNING id',
      [`${name.split(' ')[0]}'s family`]
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
    console.error('signup error', e);
    res.status(500).json({ error: 'Server error' });
  }
});



export default router;
