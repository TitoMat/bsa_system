// backend/src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('login')
  @UseGuards(LoginRateLimitGuard)
  @ApiOperation({ summary: 'Authenticate user and return JWT' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or locked account',
  })
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Re-issue JWT for a still-valid session (sliding window)',
  })
  @ApiResponse({ status: 200, description: 'New token issued' })
  @ApiResponse({
    status: 401,
    description: 'Token missing, expired, or invalid',
  })
  refresh(@Req() req: any) {
    if (!req?.user?.sub) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.authService.refreshToken(req.user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@Req() req: any) {
    if (!req?.user?.sub) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.authService.findUserById(req.user.sub);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const permissions = await this.permissionsService.getEffectivePermissions(
      user.id,
      user.role,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        themePreference: user.themePreference,
        avatarUrl: user.avatarUrl,
        employeeId: user.employeeId,
        phone: user.phone,
        department: user.department,
        position: user.position,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Patch('theme')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update current user theme preference' })
  @ApiResponse({ status: 200, description: 'Theme preference updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateTheme(
    @Req() req: any,
    @Body('themePreference') themePreference: string,
  ) {
    if (!req?.user?.sub) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.authService.updateTheme(req.user.sub, themePreference);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(@Req() req: any, @Body() dto: UpdateMyProfileDto) {
    if (!req?.user?.sub) {
      throw new UnauthorizedException('Unauthorized');
    }
    await this.authService.updateMyProfile(req.user.sub, dto);
    return this.me(req);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Upload current user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!req?.user?.sub) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!file) {
      throw new UnauthorizedException('No file provided');
    }
    return this.authService.uploadAvatar(req.user.sub, file);
  }

  @Get('avatar/:userId')
  @ApiOperation({ summary: 'Get user avatar image' })
  @ApiResponse({ status: 200, description: 'Avatar image' })
  @ApiResponse({ status: 404, description: 'Avatar not found' })
  async getAvatar(@Param('userId') userId: string, @Res() res: Response) {
    const result = await this.authService.getAvatarStream(userId);
    if (!result) {
      res.status(HttpStatus.NOT_FOUND).end();
      return;
    }

    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    const mime = mimeMap[result.ext] || 'application/octet-stream';
    res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' });
    result.stream.pipe(res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Logout and revoke current token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req: any) {
    const authHeader = req.headers?.authorization as string | undefined;
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    await this.authService.logout(token);

    return { message: 'Logged out successfully' };
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  changePassword(@Req() req: any, @Body() payload: ChangePasswordDto) {
    if (!req?.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.changePassword(req.user.sub, payload, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }
}
