import { DomainError } from '../errors/DomainError.js';
import { Admin, Organizer, Student } from '../entities/Account.js';

/**
 * Factory pattern: centralises construction of role-specific domain objects.
 * Open/Closed Principle: a new role is added with AccountFactory.register(role, Class);
 * no existing code has to be edited.
 */
export class AccountFactory {
  static #registry = new Map([
    ['ADMIN', Admin],
    ['ORGANIZER', Organizer],
    ['STUDENT', Student]
  ]);

  static register(role, accountClass) { AccountFactory.#registry.set(role, accountClass); }

  static create(data) {
    const AccountClass = AccountFactory.#registry.get(data?.role);
    if (!AccountClass) throw new DomainError('Unsupported account role.', 400, 'UNKNOWN_ROLE');
    return new AccountClass(data);
  }
}
