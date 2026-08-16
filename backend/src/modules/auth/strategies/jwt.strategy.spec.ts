import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { UsersService } from '../../users/users.service';
import { JwtPayload, JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: UsersService;

  const mockUser: User = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Organizer One',
    email: 'organizer1@elite.dev',
    passwordHash: '$2b$10$encryptedPasswordHashString',
    role: UserRole.ORGANIZER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
    expect(usersService).toBeDefined();
  });

  describe('validate', () => {
    it('should validate payload and return sanitized user without passwordHash', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const payload: JwtPayload = {
        sub: mockUser.id,
        role: mockUser.role,
      };

      const result = await strategy.validate(payload);

      expect(mockUsersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(
        (result as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('should throw 401 UNAUTHORIZED when payload sub is missing', async () => {
      await expect(
        strategy.validate({ sub: '', role: UserRole.CUSTOMER }),
      ).rejects.toThrow(UnauthorizedException);

      try {
        await strategy.validate({ sub: '', role: UserRole.CUSTOMER });
      } catch (err: unknown) {
        const error = err as UnauthorizedException;
        expect(error.getStatus()).toBe(401);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('UNAUTHORIZED');
      }
    });

    it('should throw 401 UNAUTHORIZED when user does not exist in database', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const payload: JwtPayload = {
        sub: 'non-existent-user-id',
        role: UserRole.CUSTOMER,
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await strategy.validate(payload);
      } catch (err: unknown) {
        const error = err as UnauthorizedException;
        expect(error.getStatus()).toBe(401);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('UNAUTHORIZED');
      }
    });
  });
});
