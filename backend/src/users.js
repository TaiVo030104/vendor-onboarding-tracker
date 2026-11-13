import crypto from 'node:crypto';

export const USERS = [
  { id: 'u-linh', username: 'linh', name: 'Linh', password: 'password' },
  { id: 'u-huy', username: 'huy', name: 'Huy', password: 'password' },
  { id: 'u-mai', username: 'mai', name: 'Mai', password: 'password' },
];

const sessions = new Map();

export function publicUser(user) {
  return { id: user.id, username: user.username, name: user.name };
}

export function login(username, password) {
  const user = USERS.find(
    (u) => u.username === String(username ?? '').trim().toLowerCase() && u.password === password,
  );
  if (!user) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  return { token, user: publicUser(user) };
}

export function logout(token) {
  sessions.delete(token);
}

export function userForToken(token) {
  const userId = sessions.get(token);
  return USERS.find((u) => u.id === userId) ?? null;
}

export function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = token && userForToken(token);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });
  req.user = publicUser(user);
  req.token = token;
  next();
}
