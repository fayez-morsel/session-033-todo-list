import express from 'express';
import { q } from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

/**
 * GET /todos
 */
router.get('/', requireAuth, async (req, res) => {
  const { assigneeId, isDone, dueBefore, dueAfter } = req.query;
  const cond = ['t.family_id = $1'];
  const params = [req.user.fid];

  if (assigneeId) { params.push(assigneeId); cond.push(`t.assignee_id = $${params.length}`); }
  if (typeof isDone !== 'undefined') { params.push(isDone === 'true'); cond.push(`t.is_done = $${params.length}`); }
  if (dueBefore) { params.push(dueBefore); cond.push(`t.due_at <= $${params.length}`); }
  if (dueAfter) { params.push(dueAfter); cond.push(`t.due_at >= $${params.length}`); }

  const sql = `SELECT t.*, u.full_name AS assignee_name
               FROM todo t
               JOIN app_user u ON u.id=t.assignee_id
               WHERE ${cond.join(' AND ')}
               ORDER BY COALESCE(t.due_at, 'infinity') ASC, t.created_at DESC`;
  try {
    const { rows } = await q(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('list todos error', e);
    res.status(500).json({ error: 'Server error' });
  }
});



export default router;
