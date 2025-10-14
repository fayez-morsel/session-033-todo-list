// backend/auth.js
import jwt from 'jsonwebtoken';


export function signToken(user) {
return jwt.sign(
{ uid: user.id, fid: user.family_id, email: user.email },
process.env.JWT_SECRET,
{ expiresIn: '7d' }
);
}


export function requireAuth(req, res, next) {
const hdr = req.headers.authorization || '';
const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
if (!token) return res.status(401).json({ error: 'Missing token' });
try {
const payload = jwt.verify(token, process.env.JWT_SECRET);
req.user = payload; // { uid, fid, email }
next();
} catch (e) {
return res.status(401).json({ error: 'Invalid token' });
}
}