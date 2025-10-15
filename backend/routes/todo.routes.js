import express from "express";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";

const router = express.Router();

/**
 * GET /todos
 */
router.get("/", requireAuth, async (req, res) => {
  const { assigneeId, isDone, dueBefore, dueAfter } = req.query;
  const cond = ["t.family_id = $1"];
  const params = [req.user.fid];

  if (assigneeId) {
    params.push(assigneeId);
    cond.push(`t.assignee_id = $${params.length}`);
  }
  if (typeof isDone !== "undefined") {
    params.push(isDone === "true");
    cond.push(`t.is_done = $${params.length}`);
  }
  if (dueBefore) {
    params.push(dueBefore);
    cond.push(`t.due_at <= $${params.length}`);
  }
  if (dueAfter) {
    params.push(dueAfter);
    cond.push(`t.due_at >= $${params.length}`);
  }

  const sql = `SELECT t.*, u.full_name AS assignee_name
               FROM todo t
               JOIN app_user u ON u.id=t.assignee_id
               WHERE ${cond.join(" AND ")}
               ORDER BY COALESCE(t.due_at, 'infinity') ASC, t.created_at DESC`;
  try {
    const { rows } = await q(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("list todos error", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /todos
 */
router.post("/", requireAuth, async (req, res) => {
  const { title, description, due_at, assignee_id } = req.body;
  if (!title || !assignee_id)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const { rows } = await q(
      `INSERT INTO todo(family_id, creator_id, assignee_id, title, description, due_at)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        req.user.fid,
        req.user.uid,
        assignee_id,
        title,
        description || null,
        due_at || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("create todo error", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /todos/:id
 */
router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const allowed = ["title", "description", "due_at", "assignee_id", "is_done"];
  const sets = [];
  const params = [];

  allowed.forEach((k) => {
    if (k in req.body) {
      params.push(req.body[k]);
      sets.push(`${k} = $${params.length}`);
    }
  });

  if (!sets.length) return res.status(400).json({ error: "No fields" });

  params.push(req.user.fid);
  params.push(id);

  const sql = `UPDATE todo SET ${sets.join(", ")}
               WHERE family_id=$${params.length - 1} AND id=$${params.length}
               RETURNING *`;
  try {
    const { rows } = await q(sql, params);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("update todo error", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /todos/:id
 */
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await q(
      "DELETE FROM todo WHERE family_id=$1 AND id=$2",
      [req.user.fid, id]
    );
    if (!rowCount) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error("delete todo error", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
