import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { CurrentUser } from '../src/modules/auth/decorators/current-user.decorator';
import { Roles } from '../src/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import {
  type AuthenticatedUser,
  JwtStrategy,
} from '../src/modules/auth/strategies/jwt.strategy';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UsersService } from '../src/modules/users/users.service';

@Controller('test-protected')
class TestProtectedController {
  @Get('organizer-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  organizerOnly(@CurrentUser() user: AuthenticatedUser) {
    return { message: 'Welcome Organizer', user };
  }

  @Get('customer-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  customerOnly(@CurrentUser() user: AuthenticatedUser) {
    return { message: 'Welcome Customer', user };
  }
}

describe('Auth & RBAC Integration / E2E', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const rawPassword = 'password123';
  let organizerPasswordHash: string;
  let customerPasswordHash: string;

  const mockOrganizer = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Organizer One',
    email: 'organizer1@elite.dev',
    passwordHash: '',
    role: UserRole.ORGANIZER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Customer One',
    email: 'customer1@elite.dev',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const usersDb = new Map<string, typeof mockOrganizer>();

  const mockUsersService = {
    findByEmail: jest.fn((email: string) => {
      const user = usersDb.get(email.toLowerCase().trim());
      return Promise.resolve(user ?? null);
    }),
    findById: jest.fn((id: string) => {
      for (const u of usersDb.values()) {
        if (u.id === id) return Promise.resolve(u);
      }
      return Promise.resolve(null);
    }),
  };

  beforeAll(async () => {
    organizerPasswordHash = await bcrypt.hash(rawPassword, 10);
    customerPasswordHash = await bcrypt.hash(rawPassword, 10);

    mockOrganizer.passwordHash = organizerPasswordHash;
    mockCustomer.passwordHash = customerPasswordHash;

    usersDb.set(mockOrganizer.email, mockOrganizer);
    usersDb.set(mockCustomer.email, mockCustomer);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-auth-rbac-spec',
              JWT_EXPIRES_IN: '1d',
            }),
          ],
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.getOrThrow<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get('JWT_EXPIRES_IN', '1d'),
            },
          }),
        }),
      ],
      controllers: [AuthController, TestProtectedController],
      providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  interface ApiErrorResponse {
    statusCode: number;
    code: string;
    message?: string;
    passwordHash?: string;
  }

  interface LoginTestResponse {
    accessToken: string;
    user: AuthenticatedUser & { passwordHash?: string };
    passwordHash?: string;
  }

  interface ProtectedTestResponse {
    message: string;
    user: AuthenticatedUser & { passwordHash?: string };
  }

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user with valid credentials, returning token and public user without passwordHash', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'organizer1@elite.dev',
          password: rawPassword,
        })
        .expect(200);

      const body = response.body as LoginTestResponse;
      expect(body).toHaveProperty('accessToken');
      expect(typeof body.accessToken).toBe('string');
      expect(body.user).toEqual({
        id: mockOrganizer.id,
        name: mockOrganizer.name,
        email: mockOrganizer.email,
        role: UserRole.ORGANIZER,
      });
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.passwordHash).toBeUndefined();
    });

    it('should reject login with wrong password and return 401 INVALID_CREDENTIALS', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'organizer1@elite.dev',
          password: 'incorrectPassword',
        })
        .expect(401);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(401);
      expect(body.code).toBe('INVALID_CREDENTIALS');
      expect(body.passwordHash).toBeUndefined();
    });

    it('should reject login for non-existent email and return 401 INVALID_CREDENTIALS', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@elite.dev',
          password: rawPassword,
        })
        .expect(401);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(401);
      expect(body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request without token and return 401 UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(401);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid JWT token and return 401 UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.value')
        .expect(401);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(401);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should return public user data for valid JWT token and never leak passwordHash', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer.id,
        role: mockCustomer.role,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as AuthenticatedUser & {
        passwordHash?: string;
      };
      expect(body).toEqual({
        id: mockCustomer.id,
        name: mockCustomer.name,
        email: mockCustomer.email,
        role: UserRole.CUSTOMER,
      });
      expect(body.passwordHash).toBeUndefined();
    });
  });

  describe('RBAC Role Protection', () => {
    it('should allow access to role-protected endpoint when user has the matching role', async () => {
      const token = await jwtService.signAsync({
        sub: mockOrganizer.id,
        role: mockOrganizer.role,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/organizer-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as ProtectedTestResponse;
      expect(body.message).toBe('Welcome Organizer');
      expect(body.user.role).toBe(UserRole.ORGANIZER);
      expect(body.user.passwordHash).toBeUndefined();
    });

    it('should reject access with 403 FORBIDDEN when user has an incompatible role', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer.id,
        role: mockCustomer.role,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/organizer-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(403);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated request to role-protected endpoint with 401 UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/organizer-only')
        .expect(401);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(401);
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });
});
