import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
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
import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverQueryDto } from './dto/driver-query.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../permissions/permissions.guard';
import { Permissions } from '../../../permissions/permissions.decorator';
import { ApiPermissions } from '../../../common/swagger/api-permissions.decorator';
import { PERMISSIONS } from '../../../permissions/permission.constants';

@Controller('drivers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Drivers')
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(private readonly driverService: DriverService) {}

  private getActor(req: any) {
    if (!req?.user) throw new UnauthorizedException('Unauthorized');
    return { sub: req.user.sub, email: req.user.email };
  }

  @Get()
  @Permissions(PERMISSIONS.DRIVER_VIEW)
  @ApiPermissions(PERMISSIONS.DRIVER_VIEW)
  @ApiOperation({ summary: 'List all drivers' })
  @ApiResponse({ status: 200, description: 'Drivers returned' })
  findAll(@Query() query: DriverQueryDto) {
    return this.driverService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.DRIVER_VIEW)
  @ApiPermissions(PERMISSIONS.DRIVER_VIEW)
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiResponse({ status: 200, description: 'Driver returned' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  findOne(@Param('id') id: string) {
    return this.driverService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.DRIVER_CREATE)
  @ApiPermissions(PERMISSIONS.DRIVER_CREATE)
  @ApiOperation({ summary: 'Create a new driver' })
  @ApiResponse({ status: 201, description: 'Driver created' })
  create(@Body() payload: CreateDriverDto, @Req() req: any) {
    return this.driverService.create(payload, this.getActor(req));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.DRIVER_EDIT)
  @ApiPermissions(PERMISSIONS.DRIVER_EDIT)
  @ApiOperation({ summary: 'Update a driver' })
  @ApiResponse({ status: 200, description: 'Driver updated' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateDriverDto,
    @Req() req: any,
  ) {
    return this.driverService.update(id, payload, this.getActor(req));
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.DRIVER_DELETE)
  @ApiPermissions(PERMISSIONS.DRIVER_DELETE)
  @ApiOperation({ summary: 'Delete a driver' })
  @ApiResponse({ status: 200, description: 'Driver deleted' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.driverService.delete(id, this.getActor(req));
  }

  @Patch(':id/toggle-active')
  @Permissions(PERMISSIONS.DRIVER_EDIT)
  @ApiPermissions(PERMISSIONS.DRIVER_EDIT)
  @ApiOperation({ summary: 'Toggle driver active status' })
  @ApiResponse({ status: 200, description: 'Driver status toggled' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  toggleActive(@Param('id') id: string, @Req() req: any) {
    return this.driverService.toggleActive(id, this.getActor(req));
  }
}
