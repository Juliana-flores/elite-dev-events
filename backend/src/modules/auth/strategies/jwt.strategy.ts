import { Injectable, UnauthorizedException } from '@nestjs/common';

import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy {
  constructor(private readonly usersService: UsersService) {}

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid token payload',
      });
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'User no longer exists',
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
