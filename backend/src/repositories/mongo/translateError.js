import { ConflictError } from '../../domain/errors/DomainError.js';

/** Keeps Mongo-specific error codes out of the service layer. */
export function translateMongoError(error) {
  if (error?.code === 11000) return new ConflictError('A record with these details already exists.', 'DUPLICATE');
  return error;
}
