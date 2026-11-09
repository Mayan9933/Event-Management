import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

try {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.trim().length < 12) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) in backend/.env');
  }
  if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random string of at least 32 characters in backend/.env');

  await connectDB();
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD.trim(), 12);
  const existingAdmin = await User.findOne({ role: 'ADMIN' });

  if (existingAdmin) {
    // Re-sync the single admin with the current .env so the credentials always work.
    existingAdmin.email = email;
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.status = 'ACTIVE';
    if (ADMIN_NAME) existingAdmin.name = ADMIN_NAME;
    await existingAdmin.save();
    console.log(`Admin account updated. Sign in with ${email} and the ADMIN_PASSWORD from backend/.env.`);
  } else {
    await User.create({ name: ADMIN_NAME || 'System Administrator', email, passwordHash, role: 'ADMIN', status: 'ACTIVE' });
    console.log(`Single admin account created for ${email}. Keep its credentials private.`);
  }
} catch (error) {
  console.error(`Admin seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
