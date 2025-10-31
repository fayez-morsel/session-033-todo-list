import "./env.js";
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import inviteRoutes from './routes/invite.routes.js';
import todoRoutes from './routes/todo.routes.js';
import userRoutes from './routes/user.routes.js';
import familyRoutes from './routes/family.routes.js';

const app = express();

app.use(cors({
  origin: process.env.ORIGIN,
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/invites', inviteRoutes);
app.use('/todos', todoRoutes);
app.use('/users', userRoutes);
app.use('/families', familyRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log('API on :' + port);
});
