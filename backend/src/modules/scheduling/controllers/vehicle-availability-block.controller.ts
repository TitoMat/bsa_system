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
import { VehicleAvailabilityBlockService } from '../services/vehicle-availability-block.service';
import { CreateVehicleAvailabilityBlockDto } from '../dto/create-vehicle-availability-block.dto';
import { UpdateVehicleAvailabilityBlockDto } from '../dto/update-vehicle-availability-block.dto';
import { QueryVehicleAvailabilityBlockDto } from '../dto/query-vehicle-availability-block.dto';

@Controller('vehicle-availability-blocks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Vehicle Availability Blocks')
export class VehicleAvailabilityBlockController {
  constructor(private readonly blockService: VehicleAvailabilityBlockService) {}

  @Get()
  @Permissions(PERMISSIONS.CAR_VIEW)
  @ApiOperation({
    summary: 'List vehicle availability blocks (date range, vehicle, reason)',
  })
  findAll(@Query() query: QueryVehicleAvailabilityBlockDto) {
    return this.blockService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CAR_VIEW)
  @ApiOperation({ summary: 'Get an availability block by ID' })
  findOne(@Param('id') id: string) {
    return this.blockService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.CAR_EDIT)
  @ApiOperation({ summary: 'Create a vehicle availability block' })
  create(
    @Req() req: { user: { sub: string; email: string } },
    @Body() dto: CreateVehicleAvailabilityBlockDto,
  ) {
    return this.blockService.create(dto, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CAR_EDIT)
  @ApiOperation({ summary: 'Update a vehicle availability block' })
  update(
    @Req() req: { user: { sub: string; email: string } },
    @Param('id') id: string,
    @Body() dto: UpdateVehicleAvailabilityBlockDto,
  ) {
    return this.blockService.update(id, dto, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CAR_EDIT)
  @ApiOperation({
    summary: 'Delete a vehicle availability block (explicit and audited)',
  })
  remove(
    @Req() req: { user: { sub: string; email: string } },
    @Param('id') id: string,
  ) {
    return this.blockService.remove(id, {
      sub: req.user.sub,
      email: req.user.email,
    });
  }
}
