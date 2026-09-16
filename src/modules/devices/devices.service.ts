// src/modules/devices/devices.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Device, DeviceStatus } from './entities/device.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PairDeviceDto, UpdateDeviceDto } from './dto/pair-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepo: Repository<Device>,
  ) {}

  async register(
    organizationId: string,
    dto: RegisterDeviceDto,
  ): Promise<{ device: Device; pairingCode: string }> {
    const deviceCode = this.generateDeviceCode();

    const device = this.devicesRepo.create({
      ...dto,
      organizationId,
      deviceCode,
      status: DeviceStatus.PENDING_PAIRING,
      metadata: dto.metadata || {},
    });

    const saved = await this.devicesRepo.save(device);
    return {
      device: saved,
      pairingCode: deviceCode,
    };
  }

  async pair(
    dto: PairDeviceDto,
  ): Promise<{ device: Device; deviceToken: string }> {
    const device = await this.devicesRepo.findOne({
      where: { deviceCode: dto.deviceCode },
    });

    if (!device) {
      throw new NotFoundException('Invalid pairing code');
    }

    if (device.status === DeviceStatus.REVOKED) {
      throw new BadRequestException('Device pairing has been revoked by admin');
    }

    const rawToken = `devtok_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = this.hashToken(rawToken);

    device.tokenHash = tokenHash;
    device.status = DeviceStatus.ACTIVE;
    device.lastSeenAt = new Date();
    if (dto.metadata) {
      device.metadata = { ...device.metadata, ...dto.metadata };
    }

    const updated = await this.devicesRepo.save(device);
    delete updated.tokenHash;

    return {
      device: updated,
      deviceToken: rawToken,
    };
  }

  async validateDeviceToken(rawToken: string): Promise<Device> {
    const tokenHash = this.hashToken(rawToken);
    const device = await this.devicesRepo.findOne({
      where: { tokenHash, status: DeviceStatus.ACTIVE },
    });

    if (!device) {
      throw new UnauthorizedException('Invalid or inactive device token');
    }

    // Update last seen timestamp
    device.lastSeenAt = new Date();
    await this.devicesRepo.save(device);

    return device;
  }

  async findAll(
    organizationId: string,
    locationId?: string,
  ): Promise<Device[]> {
    const where: any = { organizationId };
    if (locationId) where.locationId = locationId;

    const devices = await this.devicesRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return devices.map((d) => {
      delete d.tokenHash;
      return d;
    });
  }

  async findById(organizationId: string, id: string): Promise<Device> {
    const device = await this.devicesRepo.findOne({
      where: { id, organizationId },
    });
    if (!device) {
      throw new NotFoundException(`Device not found with ID: ${id}`);
    }
    delete device.tokenHash;
    return device;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateDeviceDto,
  ): Promise<Device> {
    const device = await this.findById(organizationId, id);
    Object.assign(device, dto);
    const saved = await this.devicesRepo.save(device);
    delete saved.tokenHash;
    return saved;
  }

  async revoke(
    organizationId: string,
    id: string,
  ): Promise<{ success: boolean }> {
    const device = await this.findById(organizationId, id);
    device.status = DeviceStatus.REVOKED;
    device.tokenHash = undefined;
    await this.devicesRepo.save(device);
    return { success: true };
  }

  private generateDeviceCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DEV-';
    for (let i = 0; i < 4; i++)
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++)
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
