// backend/src/users/users.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UnlockUserDto } from './dto/unlock-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../permissions/permission.constants';
import { Permissions } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { ApiPermissions } from '../common/swagger/api-permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private getActor(req: any) {
    if (!req?.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      sub: req.user.sub,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    };
  }

  @Get()
  @Permissions(PERMISSIONS.USERS_VIEW)
  @ApiPermissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Users returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: UserListQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USERS_VIEW)
  @ApiPermissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.USERS_CREATE)
  @ApiPermissions(PERMISSIONS.USERS_CREATE)
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() payload: CreateUserDto, @Req() req: any) {
    return this.usersService.create(payload, this.getActor(req));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.USERS_EDIT)
  @ApiPermissions(PERMISSIONS.USERS_EDIT)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, payload, this.getActor(req));
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.USERS_CHANGE_STATUS)
  @ApiPermissions(PERMISSIONS.USERS_CHANGE_STATUS)
  @ApiOperation({ summary: 'Activate or deactivate user' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  changeStatus(
    @Param('id') id: string,
    @Body() payload: ChangeUserStatusDto,
    @Req() req: any,
  ) {
    return this.usersService.changeStatus(id, payload, this.getActor(req));
  }

  @Patch(':id/reset-password')
  @Permissions(PERMISSIONS.USERS_RESET_PASSWORD)
  @ApiPermissions(PERMISSIONS.USERS_RESET_PASSWORD)
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password reset' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  resetPassword(
    @Param('id') id: string,
    @Body() payload: ResetPasswordDto,
    @Req() req: any,
  ) {
    return this.usersService.resetPassword(id, payload, this.getActor(req));
  }

  @Patch(':id/unlock')
  @Permissions(PERMISSIONS.USERS_UNLOCK)
  @ApiPermissions(PERMISSIONS.USERS_UNLOCK)
  @ApiOperation({ summary: 'Unlock user account' })
  @ApiResponse({ status: 200, description: 'User unlocked' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  unlockUser(
    @Param('id') id: string,
    @Body() payload: UnlockUserDto,
    @Req() req: any,
  ) {
    return this.usersService.unlockUser(id, payload, this.getActor(req));
  }
}
