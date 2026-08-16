import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser: User = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Organizer User',
    email: 'organizer@elite.dev',
    passwordHash: '$2b$10$hashedpasswordstringsample',
    role: UserRole.ORGANIZER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user if found by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('organizer@elite.dev');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'organizer@elite.dev' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@elite.dev');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user if found by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found by id', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('Password Hashing Verification', () => {
    it('should hash a password and verify it correctly with bcrypt', async () => {
      const rawPassword = 'password';
      const hash = await bcrypt.hash(rawPassword, 10);

      expect(hash).not.toEqual(rawPassword);
      expect(hash.startsWith('$2b$10$') || hash.startsWith('$2a$10$')).toBe(
        true,
      );

      const isMatch = await bcrypt.compare(rawPassword, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare('wrongpassword', hash);
      expect(isWrongMatch).toBe(false);
    });
  });
});
