import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const rawPassword = 'validPassword123';
  let passwordHash: string;

  const mockUser: User = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Customer One',
    email: 'customer1@elite.dev',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(rawPassword, 10);
    mockUser.passwordHash = passwordHash;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(usersService).toBeDefined();
    expect(jwtService).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate user and return accessToken with user data omitting passwordHash', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.login({
        email: 'customer1@elite.dev',
        password: rawPassword,
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'customer1@elite.dev',
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        role: mockUser.role,
      });

      expect(result).toEqual({
        accessToken: 'signed-jwt-token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
        },
      });
      expect(
        (result.user as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('should normalize email before calling findByEmail', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('signed-jwt-token');

      await service.login({
        email: '  CUSTOMER1@ELITE.DEV  ',
        password: rawPassword,
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'customer1@elite.dev',
      );
    });

    it('should throw 401 INVALID_CREDENTIALS when user is not found without leaking user existence', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@elite.dev',
          password: 'anyPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);

      try {
        await service.login({
          email: 'unknown@elite.dev',
          password: 'anyPassword',
        });
      } catch (err: unknown) {
        const error = err as UnauthorizedException;
        expect(error.getStatus()).toBe(401);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('INVALID_CREDENTIALS');
      }

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw 401 INVALID_CREDENTIALS when password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'customer1@elite.dev',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);

      try {
        await service.login({
          email: 'customer1@elite.dev',
          password: 'wrongPassword',
        });
      } catch (err: unknown) {
        const error = err as UnauthorizedException;
        expect(error.getStatus()).toBe(401);
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('INVALID_CREDENTIALS');
      }

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
