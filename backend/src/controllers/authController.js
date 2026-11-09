import { auth } from '../container.js';

export async function login(req, res) {
  res.json(await auth.login(req.body || {}));
}
export async function registerStudent(req, res) {
  res.status(201).json(await auth.registerStudent(req.body || {}));
}
export async function me(req, res) {
  res.json({ user: await auth.currentUser(req.auth.id) });
}
