// src/modules/locations/locations.controller.ts
import {
    Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
    constructor(private locationsService: LocationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new store location or sales channel' })
    create(@CurrentOrg() orgId: string, @Body() dto: CreateLocationDto) {
        return this.locationsService.create(orgId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all locations for the authenticated organization' })
    findAll(@CurrentOrg() orgId: string) {
        return this.locationsService.findAll(orgId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get location details by ID' })
    findById(@CurrentOrg() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.locationsService.findById(orgId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update location settings' })
    update(
        @CurrentOrg() orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateLocationDto,
    ) {
        return this.locationsService.update(orgId, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate a location' })
    delete(@CurrentOrg() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.locationsService.delete(orgId, id);
    }
}
