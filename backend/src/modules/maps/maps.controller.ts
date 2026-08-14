import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Logger,
  UseGuards,
  UseFilters,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MapsService } from './maps.service';
import { SearchLocationDto } from './dto/search-location.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { RouteRequestDto } from './dto/route-request.dto';
import { SearchPoiDto } from './dto/search-poi.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { Permissions } from '../../permissions/permissions.decorator';
import { ApiPermissions } from '../../common/swagger/api-permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';
import { MapsRateLimitGuard } from './guards/maps-rate-limit.guard';
import { MapsExceptionFilter } from './maps-exception.filter';

@Controller('maps')
@UseGuards(JwtAuthGuard, PermissionsGuard, MapsRateLimitGuard)
@UseFilters(MapsExceptionFilter)
@ApiBearerAuth('bearer')
@ApiTags('Maps')
export class MapsController {
  private readonly logger = new Logger(MapsController.name);

  constructor(private readonly mapsService: MapsService) {}

  private getActor(req: any) {
    if (!req?.user) throw new UnauthorizedException('Unauthorized');
    return { sub: req.user.sub, email: req.user.email };
  }

  @Get('search')
  @Permissions(PERMISSIONS.MAPS_VIEW)
  @ApiPermissions(PERMISSIONS.MAPS_VIEW)
  @ApiOperation({ summary: 'Search for a location' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(@Query() query: SearchLocationDto) {
    return this.mapsService.searchLocation(query.q, query.limit);
  }

  @Get('reverse')
  @Permissions(PERMISSIONS.MAPS_VIEW)
  @ApiPermissions(PERMISSIONS.MAPS_VIEW)
  @ApiOperation({ summary: 'Reverse geocode coordinates' })
  @ApiResponse({ status: 200, description: 'Address returned' })
  async reverseGeocode(@Query() query: ReverseGeocodeDto) {
    return this.mapsService.reverseGeocode(query.latitude, query.longitude);
  }

  @Post('route')
  @Permissions(PERMISSIONS.MAPS_VIEW)
  @ApiPermissions(PERMISSIONS.MAPS_VIEW)
  @ApiOperation({ summary: 'Calculate a route between two points' })
  @ApiResponse({ status: 200, description: 'Route returned' })
  async calculateRoute(@Body() body: RouteRequestDto, @Req() req: any) {
    this.getActor(req);
    return this.mapsService.calculateRoute(body);
  }

  @Get('poi')
  @Permissions(PERMISSIONS.MAPS_VIEW)
  @ApiPermissions(PERMISSIONS.MAPS_VIEW)
  @ApiOperation({ summary: 'Search for nearby points of interest' })
  @ApiResponse({ status: 200, description: 'POI results returned' })
  async searchPOI(@Query() query: SearchPoiDto) {
    return this.mapsService.searchPOI(
      query.latitude,
      query.longitude,
      query.radius ?? 5000,
      query.categories ?? [],
    );
  }
}
