import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService, LoginResponse } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ApiErrorResponseDto,
  AuthUserDto,
  LoginResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import * as jwtStrategy from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful. Returns JWT and user profile.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error in request payload',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password (INVALID_CREDENTIALS)',
    type: ApiErrorResponseDto,
  })
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns profile of current authenticated user',
    type: AuthUserDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid, missing, or expired token',
    type: ApiErrorResponseDto,
  })
  getMe(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
  ): jwtStrategy.AuthenticatedUser {
    return user;
  }
}
