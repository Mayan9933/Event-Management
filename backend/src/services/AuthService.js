import { AccountFactory } from '../domain/factories/AccountFactory.js';
import { AuthenticationError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../domain/errors/DomainError.js';

const ROLES = ['ADMIN', 'ORGANIZER', 'STUDENT'];

/** Authentication use-cases. Collaborators are injected (Dependency Inversion). */
export class AuthService {
  #users; #hasher; #tokens; #config;

  constructor({ users, hasher, tokens, config }) {
    this.#users = users; this.#hasher = hasher; this.#tokens = tokens; this.#config = config;
  }

  async login({ email, password, expectedRole }) {
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || !ROLES.includes(expectedRole)) {
      throw new ValidationError('Please enter your email, password and select a valid account type.');
    }
    const user = await this.#users.findByEmail(email.toLowerCase().trim());
    if (!user || user.status !== 'ACTIVE' || !(await this.#hasher.compare(password, user.passwordHash))) {
      throw new AuthenticationError('Invalid email or password.', 'INVALID_CREDENTIALS');
    }
    if (user.role !== expectedRole) {
      throw new ForbiddenError(`This account is not registered as ${expectedRole.toLowerCase()}. Choose the correct login option.`, 'WRONG_ROLE');
    }
    const { secret, expiresIn } = this.#config();
    const token = this.#tokens.sign({ id: String(user._id), role: user.role }, secret, { expiresIn });
    return { token, user: AuthService.#publicUser(user) };
  }

  async registerStudent({ name, email, password }) {
    if (!name || !email || !password || password.length < 8) {
      throw new ValidationError('Enter your name, institute email and a password of at least 8 characters.');
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@iiita.ac.in')) throw new ValidationError('Please use your IIITA institute email address.');
    const passwordHash = await this.#hasher.hash(password, 12);
    try {
      await this.#users.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: 'STUDENT', status: 'ACTIVE' });
    } catch (error) {
      if (error instanceof ConflictError) throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
      throw error;
    }
    return { message: 'Student account created. You can now sign in.' };
  }

  async currentUser(id) {
    const user = await this.#users.findById(id);
    if (!user || user.status !== 'ACTIVE') throw new NotFoundError('Account not found or inactive.');
    // Polymorphism at runtime: the role object supplies its own workspace summary.
    return AuthService.#publicUser(user);
  }

  static #publicUser(user) {
    const account = AccountFactory.create({ ...user, id: String(user._id) });
    const { id, name, email, role, workspaceSummary } = account.toPublic();
    return { id, name, email, role, workspaceSummary };
  }
}
