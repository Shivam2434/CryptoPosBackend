// src/modules/webhooks/webhooks.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('endpoints')
  @ApiOperation({ summary: 'Register a new signed webhook endpoint' })
  createEndpoint(
    @CurrentOrg() orgId: string,
    @Body() dto: CreateWebhookEndpointDto,
  ) {
    return this.webhooksService.createEndpoint(orgId, dto);
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'List all registered webhook endpoints' })
  findAllEndpoints(@CurrentOrg() orgId: string) {
    return this.webhooksService.findAllEndpoints(orgId);
  }

  @Get('endpoints/:id')
  @ApiOperation({ summary: 'Get webhook endpoint details' })
  findEndpointById(
    @CurrentOrg() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.webhooksService.findEndpointById(orgId, id);
  }

  @Delete('endpoints/:id')
  @ApiOperation({ summary: 'Deactivate a webhook endpoint' })
  deleteEndpoint(
    @CurrentOrg() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.webhooksService.deleteEndpoint(orgId, id);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'List recent webhook delivery logs' })
  @ApiQuery({ name: 'endpointId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getDeliveries(
    @CurrentOrg() orgId: string,
    @Query('endpointId') endpointId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.getDeliveries(orgId, endpointId, limit);
  }
}
