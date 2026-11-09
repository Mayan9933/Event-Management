import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import errorHandler from './middleware/error.js';

const app = express();

// Allow localhost / 127.0.0.1 / LAN access to the Vite dev server (any port) plus FRONTEND_ORIGIN.
const extraOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/;
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || extraOrigins.includes(origin) || devOrigin.test(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'IIITA Connect API' }));
app.use('/api/auth', authRoutes);
app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use(errorHandler);
export default app;
