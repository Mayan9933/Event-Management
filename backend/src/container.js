import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoUserRepository } from './repositories/mongo/MongoUserRepository.js';
import { MongoOrganizerRequestRepository } from './repositories/mongo/MongoOrganizerRequestRepository.js';
import { MongoEventRepository } from './repositories/mongo/MongoEventRepository.js';
import { MongoRegistrationRepository } from './repositories/mongo/MongoRegistrationRepository.js';
import { DomainEventBus } from './domain/events/DomainEventBus.js';
import { registerEventHandlers } from './services/eventHandlers.js';
import { PlatformService } from './services/PlatformService.js';
import { AuthService } from './services/AuthService.js';

/** Composition root: the only place that knows which concrete classes are wired together. */
export const users = new MongoUserRepository();
const requests = new MongoOrganizerRequestRepository();
const events = new MongoEventRepository();
const registrations = new MongoRegistrationRepository();
const bus = new DomainEventBus();

registerEventHandlers(bus, { registrations, log: (...a) => process.env.NODE_ENV === 'test' ? undefined : console.log(...a) });

export const platform = new PlatformService({ users, requests, events, registrations, bus, hasher: bcrypt });
export const auth = new AuthService({
  users, hasher: bcrypt, tokens: jwt,
  config: () => ({ secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || '1d' })
});
