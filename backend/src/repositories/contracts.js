import { DomainError } from '../domain/errors/DomainError.js';

/**
 * Repository contracts (Dependency Inversion + Interface Segregation).
 * Services depend on these small abstractions, never on Mongoose. JavaScript has no
 * `interface` keyword, so each contract is an abstract class whose methods must be overridden.
 */
function contract(name, methods) {
  const Base = class {
    constructor() {
      if (new.target === Base) throw new DomainError(`${name} is abstract.`, 500, 'ABSTRACT_REPOSITORY');
    }
  };
  Object.defineProperty(Base, 'name', { value: name });
  for (const method of methods) {
    Base.prototype[method] = function () {
      throw new DomainError(`${name}.${method}() is not implemented.`, 500, 'NOT_IMPLEMENTED');
    };
  }
  return Base;
}

export const UserRepository = contract('UserRepository', [
  'findById', 'findByEmail', 'existsByEmail', 'create', 'listManaged',
  'deleteById', 'countStudents', 'countActiveOrganizers'
]);

export const OrganizerRequestRepository = contract('OrganizerRequestRepository', [
  'create', 'listWithoutPassword', 'findByIdWithPassword', 'update', 'deleteByEmail', 'countPending'
]);

export const EventRepository = contract('EventRepository', [
  'create', 'findById', 'findByIds', 'findPublished', 'findByOrganizer', 'findAll',
  'update', 'setStatus', 'countPublished', 'idsByOrganizer', 'deleteById', 'deleteByOrganizer'
]);

export const RegistrationRepository = contract('RegistrationRepository', [
  'countComplete', 'findOne', 'create', 'update', 'findByStudent', 'findByEvent',
  'deleteByEvent', 'deleteByEvents', 'deleteByStudent', 'countAll'
]);
