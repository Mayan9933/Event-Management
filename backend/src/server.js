import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { connectDB } from './config/db.js';

const port = process.env.PORT || 5000;

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set in backend/.env and contain at least 32 characters.');
  }
  await connectDB();
  app.listen(port, () => console.log(`IIITA Connect API running on port ${port}`));
} catch (error) {
  console.error(`Backend startup failed: ${error.message}`);
  
  process.exit(1);
}

