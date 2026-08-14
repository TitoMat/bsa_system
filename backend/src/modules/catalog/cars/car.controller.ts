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
import * as fs from 'fs';
import { CarService } from './car.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarQueryDto } from './dto/car-query.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../permissions/permissions.guard';
import { Permissions } from '../../../permissions/permissions.decorator';
import { ApiPermissions } from '../../../common/swagger/api-permissions.decorator';
import { PERMISSIONS } from '../../../permissions/permission.constants';

@Controller('cars')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Cars')
export class CarController {
  private readonly logger = new Logger(CarController.name);

  constructor(private readonly carService: CarService) {}

  private getActor(req: any) {
    if (!req?.user) throw new UnauthorizedException('Unauthorized');
    return { sub: req.user.sub, email: req.user.email };
  }

  @Get()
  @Permissions(PERMISSIONS.CAR_VIEW)
  @ApiPermissions(PERMISSIONS.CAR_VIEW)
  @ApiOperation({ summary: 'List all cars' })
  @ApiResponse({ status: 200, description: 'Cars returned' })
  findAll(@Query() query: CarQueryDto) {
    return this.carService.findAll(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CAR_VIEW)
  @ApiPermissions(PERMISSIONS.CAR_VIEW)
  @ApiOperation({ summary: 'Get car by ID' })
  @ApiResponse({ status: 200, description: 'Car returned' })
  @ApiResponse({ status: 404, description: 'Car not found' })
  findOne(@Param('id') id: string) {
    return this.carService.findOne(id);
  }

  @Post()
  @Permissions(PERMISSIONS.CAR_CREATE)
  @ApiPermissions(PERMISSIONS.CAR_CREATE)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Create a new car' })
  @ApiResponse({ status: 201, description: 'Car created' })
  create(
    @Body() payload: CreateCarDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.carService.create(payload, file, this.getActor(req));
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CAR_EDIT)
  @ApiPermissions(PERMISSIONS.CAR_EDIT)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Update a car' })
  @ApiResponse({ status: 200, description: 'Car updated' })
  @ApiResponse({ status: 404, description: 'Car not found' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateCarDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.carService.update(id, payload, file, this.getActor(req));
  }

  @Get(':id/photo')
  @ApiOperation({ summary: 'Get car photo' })
  @ApiResponse({ status: 200, description: 'Photo returned' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getPhoto(@Param('id') id: string, @Res() res: any) {
    const photoPath = this.carService.getPhotoPath(id);
    if (!photoPath || !fs.existsSync(photoPath)) {
      return res.status(404).send();
    }
    res.sendFile(photoPath);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CAR_DELETE)
  @ApiPermissions(PERMISSIONS.CAR_DELETE)
  @ApiOperation({ summary: 'Delete a car' })
  @ApiResponse({ status: 200, description: 'Car deleted' })
  @ApiResponse({ status: 404, description: 'Car not found' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.carService.delete(id, this.getActor(req));
  }
}
