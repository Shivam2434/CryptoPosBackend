// src/modules/api-keys/api-keys.controller.ts
import {
    Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
    constructor(private apiKeysService: ApiKeysService) { }

    @Post()
    @ApiOperation({ summary: 'Generate a new API key for external SDK or e-commerce integration' })
    create(@CurrentOrg() orgId: string, @Body() dto: CreateApiKeyDto) {
        return this.apiKeysService.create(orgId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all API keys for the organization' })
    findAll(@CurrentOrg() orgId: string) {
        return this.apiKeysService.findAll(orgId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get API key metadata by ID' })
    findById(@CurrentOrg() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.apiKeysService.findById(orgId, id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Revoke an API key' })
    revoke(@CurrentOrg() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.apiKeysService.revoke(orgId, id);
    }
}
