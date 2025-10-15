import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import inviteRoutes from './routes/invite.routes.js';
import todoRoutes from './routes/todo.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();

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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log('API on :' + port);
});
