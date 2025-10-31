import express from 'express';
import crypto from 'crypto';
import { q } from '../db.js';
import { requireAuth, signToken } from '../auth.js';
import { formatUserRow } from '../utils/names.js';
import { sendInviteEmail } from '../utils/email.js';

const router = express.Router();
let ensuredInviteColumns = false;

async function ensureInviteColumns() {
  if (ensuredInviteColumns) return;
  try {
    await q(`ALTER TABLE invite ADD COLUMN IF NOT EXISTS recipient_email TEXT`);
  } catch (e) {
    console.error('ensure recipient email column failed', e);
  }
  try {
    await q(`ALTER TABLE invite ADD COLUMN IF NOT EXISTS recipient_declined_at TIMESTAMPTZ`);
  } catch (e) {
    console.error('ensure recipient declined column failed', e);
  }
  try {
    await q(`ALTER TABLE invite ADD COLUMN IF NOT EXISTS recipient_user_id TEXT`);
  } catch (e) {
    console.error('ensure recipient user column failed', e);
  }
  try {
    await q(
      `ALTER TABLE invite
       ALTER COLUMN recipient_user_id
       TYPE TEXT
       USING recipient_user_id::text`
    );
  } catch (e) {
    if (!['42704'].includes(e?.code)) {
      console.error('ensure recipient user column type failed', e);
    }
  }
  ensuredInviteColumns = true;
}

/**
 * POST /invites
 */
router.post('/', requireAuth, async (req, res) => {
  const { expiresInHours = 72, email } = req.body || {};
  const raw = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

  try {
    await ensureInviteColumns();
    let trimmedEmail = null;
    let inviteeInfo = null;
    let familyName = null;
    let inviterName = null;
    if (typeof email === 'string' && email.trim()) {
      trimmedEmail = email.trim().toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      const { rows: existingUsers } = await q(
        `SELECT id, family_id, email, full_name
         FROM app_user
         WHERE email=$1`,
        [trimmedEmail]
      );
      if (existingUsers.length) {
        inviteeInfo = formatUserRow(existingUsers[0]);
      }
    }

    if (req.user?.fid) {
      const { rows: familyRows } = await q(
        `SELECT name FROM family WHERE id=$1`,
        [req.user.fid]
      );
      familyName = familyRows[0]?.name ?? null;
    }

    const { rows: inviterRows } = await q(
      `SELECT full_name
       FROM app_user
       WHERE id=$1`,
      [req.user.uid]
    );
    inviterName = inviterRows[0]?.full_name ?? null;

    const columns = ['family_id', 'token_hash', 'created_by', 'expires_at'];
    const values = [req.user.fid, tokenHash, req.user.uid, expiresAt];
    if (trimmedEmail) {
      columns.push('recipient_email');
      values.push(trimmedEmail);
    }
    if (inviteeInfo) {
      columns.push('recipient_user_id');
      values.push(inviteeInfo.id);
    }
    const placeholders = columns.map((_, idx) => `$${idx + 1}`);
    const insertSql = `INSERT INTO invite(${columns.join(',')})
         VALUES(${placeholders.join(',')}) RETURNING id`;

    const { rows } = await q(insertSql, values);
    const response = {
      token: raw,
      inviteId: rows[0].id,
      expiresAt,
      email: trimmedEmail ?? undefined,
    };
    if (inviteeInfo) {
      response.invitee = {
        id: inviteeInfo.id,
        email: inviteeInfo.email,
        familyId: inviteeInfo.familyId,
        familyLabel: inviteeInfo.familyLabel ?? null,
        fullName: inviteeInfo.fullName ?? null,
      };
      response.inviteeHasFamily = Boolean(inviteeInfo.familyId);
    }
    response.inviteeRecognized = Boolean(inviteeInfo);

    if (trimmedEmail) {
      let emailSent = false;
      try {
        emailSent = await sendInviteEmail({
          to: trimmedEmail,
          inviteToken: raw,
          familyName,
          inviterName,
        });
      } catch (emailErr) {
        console.error('send invite email error', emailErr);
      } finally {
        response.emailSent = emailSent;
      }
    } else {
      response.emailSent = false;
    }
    res.json(response);
  } catch (e) {
    console.error('create invite error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    await ensureInviteColumns();
    const email = (req.user.email || '').trim().toLowerCase();
    const uid = typeof req.user.uid === 'string' ? req.user.uid.trim() : '';

    const { rows } = await q(
      `SELECT i.id,
              i.family_id,
              i.created_at,
              i.expires_at,
              f.name AS family_name,
              au.full_name AS sender_name,
              au.email AS sender_email
       FROM invite i
       JOIN family f ON f.id = i.family_id
       LEFT JOIN app_user au ON au.id = i.created_by
       WHERE (
             ($1 <> '' AND lower(i.recipient_email) = $1)
             OR (NULLIF(i.recipient_user_id, '') = NULLIF($2, ''))
           )
         AND i.used_at IS NULL
         AND i.recipient_declined_at IS NULL
         AND i.expires_at > now()
       ORDER BY i.created_at DESC`,
      [email, uid]
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        familyName: row.family_name,
        senderName: row.sender_name ?? null,
        senderEmail: row.sender_email ?? null,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }))
    );
  } catch (e) {
    console.error('list recipient invites error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/accept', requireAuth, async (req, res) => {
  const inviteId = String(req.params.id ?? '').trim();
  if (!inviteId) {
    return res.status(400).json({ error: 'Invalid invite id' });
  }
  const forceLeave = Boolean(req.body?.forceLeave);

  try {
    await ensureInviteColumns();
    const email = (req.user.email || '').trim().toLowerCase();
    if (!email && !req.user.uid) return res.status(400).json({ error: 'Invalid user identity' });
    const userId = typeof req.user.uid === 'string' ? req.user.uid.trim() : '';

    const { rows: invites } = await q(
      `SELECT *
       FROM invite
       WHERE id::text = $1
         AND (
           ($2 <> '' AND lower(recipient_email) = $2)
           OR NULLIF(recipient_user_id, '') = NULLIF($3, '')
         )
         AND used_at IS NULL
         AND recipient_declined_at IS NULL`,
      [inviteId, email, userId]
    );

    if (!invites.length) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const invite = invites[0];
    if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'Invite expired' });
    }

    const { rows: userRows } = await q(
      `SELECT *
       FROM app_user
       WHERE id=$1`,
      [req.user.uid]
    );
    if (!userRows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userRow = userRows[0];

    const { rows: targetFamilies } = await q(
      `SELECT name
       FROM family
       WHERE id=$1`,
      [invite.family_id]
    );
    const targetFamilyName = targetFamilies[0]?.name ?? null;

    if (userRow.family_id && userRow.family_id !== invite.family_id) {
      if (!forceLeave) {
        const { rows: currentFamilyRows } = await q(
          `SELECT name
           FROM family
           WHERE id=$1`,
          [userRow.family_id]
        );
        return res.status(409).json({
          error: 'You are already part of a family. Accepting will move you to a new family.',
          requiresLeave: true,
          currentFamily: currentFamilyRows[0]?.name ?? null,
          targetFamily: targetFamilyName,
        });
      }
    }

    if (!userRow.family_id || userRow.family_id !== invite.family_id) {
      await q(
        `UPDATE app_user
         SET family_id=$1
         WHERE id=$2`,
        [invite.family_id, req.user.uid]
      );
    }

    await q(`UPDATE invite SET used_at=now(), recipient_declined_at=NULL WHERE id=$1`, [inviteId]);

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
    console.error('accept invite error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/decline', requireAuth, async (req, res) => {
  const inviteId = String(req.params.id ?? '').trim();
  if (!inviteId) {
    return res.status(400).json({ error: 'Invalid invite id' });
  }

  try {
    await ensureInviteColumns();
    const email = (req.user.email || '').trim().toLowerCase();
    if (!email && !req.user.uid) return res.status(400).json({ error: 'Invalid user identity' });
    const userId = typeof req.user.uid === 'string' ? req.user.uid.trim() : '';

    const { rowCount } = await q(
      `UPDATE invite
       SET recipient_declined_at=now()
       WHERE id=$1
         AND (
            ($2 <> '' AND lower(recipient_email) = $2)
            OR NULLIF(recipient_user_id, '') = NULLIF($3, '')
         )
         AND used_at IS NULL
         AND recipient_declined_at IS NULL`,
      [inviteId, email, userId]
    );

    if (!rowCount) {
      return res.status(404).json({ error: 'Invite not found or already handled' });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('decline invite error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

