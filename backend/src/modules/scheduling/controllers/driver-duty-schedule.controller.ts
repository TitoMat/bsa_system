import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../permissions/permissions.guard';
import { Permissions } from '../../../permissions/permissions.decorator';
import { PERMISSIONS } from '../../../permissions/permission.constants';
import { DriverDutyScheduleService } from '../services/driver-duty-schedule.service';
import { CreateDriverDutyScheduleDto } from '../dto/create-driver-duty-schedule.dto';
import { UpdateDriverDutyScheduleDto } from '../dto/update-driver-duty-schedule.dto';
import { QueryDriverDutyScheduleDto } from '../dto/query-driver-duty-schedule.dto';

@Controller('driver-duty-schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Driver Duty Schedules')
export class DriverDutyScheduleController {
  constructor(private readonly scheduleService: DriverDutyScheduleService) {}

  @Get()
  @Permissions(PERMISSIONS.DRIVER_VIEW)
  @ApiOperation({
    summary: 'List driver duty schedules (date range, driver, status)',
  })
  findAll(@Query() query: QueryDriverDutyScheduleDto) {
    return this.scheduleService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.DRIVER_VIEW)
  @ApiOperation({ summary: 'Get a driver duty schedule by ID' })
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.DRIVER_EDIT)
  @ApiOperation({ summary: 'Create a duty schedule record for a driver' })
  create(
    @Req() req: { user: { sub: string; email: string } },
    @Body() dto: CreateDriverDutyScheduleDto,
  ) {
    return this.scheduleService.create(dto, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.DRIVER_EDIT)
  @ApiOperation({ summary: 'Update a driver duty schedule' })
  update(
    @Req() req: { user: { sub: string; email: string } },
    @Param('id') id: string,
    @Body() dto: UpdateDriverDutyScheduleDto,
  ) {
    return this.scheduleService.update(id, dto, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.DRIVER_EDIT)
  @ApiOperation({
    summary: 'Delete a driver duty schedule (explicit and audited)',
  })
  remove(
    @Req() req: { user: { sub: string; email: string } },
    @Param('id') id: string,
  ) {
    return this.scheduleService.remove(id, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }
}
