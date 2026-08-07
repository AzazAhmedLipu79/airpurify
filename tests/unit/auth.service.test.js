const authService = require('../../src/services/auth.service');
const userRepository = require('../../src/repositories/user.repository');

jest.mock('../../src/repositories/user.repository');

describe('AuthService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should throw ConflictError if user email already exists during registration', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: 1, email: 'test@example.com' });

    await expect(
      authService.register({
        username: 'newuser',
        email: 'test@example.com',
        password: 'Password123!',
      })
    ).rejects.toThrow("User with email 'test@example.com' already exists");
  });

  test('should register a new user successfully and return tokens', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByUsername.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(10);
    userRepository.findById.mockResolvedValue({
      id: 10,
      username: 'newuser',
      email: 'new@example.com',
      role: 'viewer',
      status: 'active',
    });
    userRepository.storeRefreshToken.mockResolvedValue();

    const result = await authService.register({
      username: 'newuser',
      email: 'new@example.com',
      password: 'Password123!',
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.username).toBe('newuser');
  });
});
