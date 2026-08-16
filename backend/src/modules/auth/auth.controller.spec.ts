import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import { UserRole } from '../users/enums/user-role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockLoginResponse: LoginResponse = {
    accessToken: 'sample-jwt-token',
    user: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Customer One',
      email: 'customer1@elite.dev',
      role: UserRole.CUSTOMER,
    },
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(authService).toBeDefined();
  });

  describe('login', () => {
    it('should delegate login to authService and return response', async () => {
      const loginDto: LoginDto = {
        email: 'customer1@elite.dev',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockLoginResponse);
      expect(
        (result.user as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });
  });

  describe('getMe', () => {
    it('should return the authenticated user payload without passwordHash', () => {
      const authenticatedUser: AuthenticatedUser = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Customer One',
        email: 'customer1@elite.dev',
        role: UserRole.CUSTOMER,
      };

      const result = controller.getMe(authenticatedUser);

      expect(result).toEqual(authenticatedUser);
      expect(
        (result as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });
  });
});
