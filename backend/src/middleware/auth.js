import jwt from 'jsonwebtoken';
import { users } from '../container.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Please sign in.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await users.findById(payload.id, 'name email role status');

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        message: 'Your account is blocked or inactive. Please contact the Admin.'
      });
    }

    // Use current database role/status, not only the role embedded in an old token.
    req.auth = {
      id: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }
    next(error);
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return res.status(403).json({
      message: 'You do not have permission to access this resource.'
    });
  }
  next();
};
