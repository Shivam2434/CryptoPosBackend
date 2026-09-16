// src/modules/locations/locations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationStatus } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationsRepo: Repository<Location>,
  ) {}

  async create(
    organizationId: string,
    dto: CreateLocationDto,
  ): Promise<Location> {
    const location = this.locationsRepo.create({
      ...dto,
      organizationId,
      status: dto.status || LocationStatus.ACTIVE,
      timezone: dto.timezone || 'Australia/Sydney',
      metadata: dto.metadata || {},
    });
    return this.locationsRepo.save(location);
  }

  async findAll(organizationId: string): Promise<Location[]> {
    return this.locationsRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(organizationId: string, id: string): Promise<Location> {
    const location = await this.locationsRepo.findOne({
      where: { id, organizationId },
    });
    if (!location) {
      throw new NotFoundException(`Location not found with ID: ${id}`);
    }
    return location;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateLocationDto,
  ): Promise<Location> {
    const location = await this.findById(organizationId, id);
    Object.assign(location, dto);
    return this.locationsRepo.save(location);
  }

  async delete(
    organizationId: string,
    id: string,
  ): Promise<{ success: boolean }> {
    const location = await this.findById(organizationId, id);
    location.status = LocationStatus.INACTIVE;
    await this.locationsRepo.save(location);
    return { success: true };
  }
}
