import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRole } from '../../users/enums/user-role.enum';
import { AuthenticatedUser, JwtStrategy } from '../strategies/jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtStrategy: JwtStrategy;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  const mockJwtStrategy = {
    validate: jest.fn(),
  };

  interface MockRequest {
    headers: {
      authorization?: string;
    };
    user?: AuthenticatedUser;
  }

  const createMockExecutionContext = (
    authorizationHeader?: string,
  ): { context: ExecutionContext; request: MockRequest } => {
    const request: MockRequest = {
      headers: {
        authorization: authorizationHeader,
      },
      user: undefined,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtStrategy, useValue: mockJwtStrategy },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
    expect(jwtService).toBeDefined();
    expect(configService).toBeDefined();
    expect(jwtStrategy).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw 401 UNAUTHORIZED when no authorization header is present', async () => {
      const { context } = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await guard.canActivate(context);
      } catch (err: unknown) {
        const error = err as UnauthorizedException;
        expect(error.getStatus()).toBe(401);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('UNAUTHORIZED');
      }
    });

    it('should throw 401 UNAUTHORIZED when authorization header does not use Bearer scheme', async () => {
      const { context } = createMockExecutionContext('Basic dXNlcjpwYXNz');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw 401 UNAUTHORIZED when token verification fails', async () => {
      const { context } = createMockExecutionContext('Bearer invalid-token');
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await guard.canActivate(context);
      } catch (err: unknown) {
        const error = err as UnauthorizedException;
        expect(error.getStatus()).toBe(401);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('UNAUTHORIZED');
      }
    });

    it('should allow access and set request.user when token and strategy validation succeed', async () => {
      const { context, request } =
        createMockExecutionContext('Bearer valid-token');
      const payload = {
        sub: 'user-uuid',
        role: UserRole.CUSTOMER,
      };
      const validatedUser = {
        id: 'user-uuid',
        name: 'Customer One',
        email: 'customer1@elite.dev',
        role: UserRole.CUSTOMER,
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockJwtStrategy.validate.mockResolvedValue(validatedUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(mockJwtStrategy.validate).toHaveBeenCalledWith(payload);
      expect(request.user).toEqual(validatedUser);
      expect(
        (request.user as Record<string, unknown> | undefined)?.passwordHash,
      ).toBeUndefined();
    });
  });
});
