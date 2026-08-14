// backend/src/audit/audit.controller.ts
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../permissions/permission.constants';
import { Permissions } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ApiPermissions } from '../common/swagger/api-permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Audit Logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions(PERMISSIONS.AUDIT_LOGS_VIEW)
  @ApiPermissions(PERMISSIONS.AUDIT_LOGS_VIEW)
  @ApiOperation({ summary: 'List audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get('export')
  @Permissions(PERMISSIONS.AUDIT_LOGS_VIEW)
  @ApiPermissions(PERMISSIONS.AUDIT_LOGS_VIEW)
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async export(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    const csv = await this.auditService.exportCsv(query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csv);
  }
}
