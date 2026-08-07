const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const userRepository = require('../repositories/user.repository');
const { UnauthorizedError, ConflictError, BadRequestError } = require('../utils/errors');
const logger = require('../config/logger');

class AuthService {
  async register({ username, email, password, role }) {
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw new ConflictError(`User with email '${email}' already exists`);
    }

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      throw new ConflictError(`Username '${username}' is already taken`);
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userId = await userRepository.create({
      username,
      email,
      password_hash,
      role: role || 'viewer',
      status: 'active',
    });

    logger.info(`New user registered: ${username} (${email}) - Role: ${role}`);
    const user = await userRepository.findById(userId);

    const tokens = await this.generateTokenPair(user);
    return { user, ...tokens };
  }

  async login({ usernameOrEmail, password }) {
    let user = await userRepository.findByEmail(usernameOrEmail);
    if (!user) {
      user = await userRepository.findByUsername(usernameOrEmail);
    }

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError(`Account is ${user.status}. Please contact administrator.`);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    logger.info(`User logged in successfully: ${user.username} (${user.id})`);
    const tokens = await this.generateTokenPair(user);
    const { password_hash, ...sanitizedUser } = user;

    return { user: sanitizedUser, ...tokens };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const savedToken = await userRepository.findRefreshToken(tokenHash);
      if (!savedToken) {
        throw new UnauthorizedError('Refresh token is invalid or has been revoked');
      }

      const user = await userRepository.findById(decoded.id);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedError('User account associated with token is inactive');
      }

      // Revoke current token and issue fresh pair
      await userRepository.revokeRefreshToken(tokenHash);
      return await this.generateTokenPair(user);
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async generateTokenPair(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await userRepository.storeRefreshToken(user.id, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }
}

module.exports = new AuthService();
