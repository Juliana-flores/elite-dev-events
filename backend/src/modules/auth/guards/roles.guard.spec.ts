import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRole } from '../../users/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (user?: {
    id: string;
    role: UserRole | string;
  }): ExecutionContext => {
    const request = {
      user,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
    expect(reflector).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required on handler or class', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should allow access when required roles list is empty', () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user role matches one of required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        UserRole.ORGANIZER,
        UserRole.GATE,
      ]);
      const context = createMockExecutionContext({
        id: 'org-id',
        role: UserRole.ORGANIZER,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw 403 FORBIDDEN when user has incorrect role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ORGANIZER]);
      const context = createMockExecutionContext({
        id: 'cust-id',
        role: UserRole.CUSTOMER,
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (err: unknown) {
        const error = err as ForbiddenException;
        expect(error.getStatus()).toBe(403);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('FORBIDDEN');
      }
    });

    it('should throw 403 FORBIDDEN when user is not present on request', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.CUSTOMER]);
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (err: unknown) {
        const error = err as ForbiddenException;
        expect(error.getStatus()).toBe(403);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('FORBIDDEN');
      }
    });
  });
});
