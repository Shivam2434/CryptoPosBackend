// src/modules/api-keys/api-keys.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import {
  ApiKey,
  ApiKeyType,
  ApiKeyEnvironment,
} from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeysRepo: Repository<ApiKey>,
  ) {}

  async create(
    organizationId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKey; secretKey: string }> {
    const keyType = dto.keyType || ApiKeyType.SECRET;
    const environment = dto.environment || ApiKeyEnvironment.LIVE;

    const prefix = this.getKeyPrefix(keyType, environment);
    const randomSecret = crypto.randomBytes(24).toString('hex');
    const fullKey = `${prefix}${randomSecret}`;
    const keyHash = this.hashKey(fullKey);
    const displayPrefix = `${prefix}${randomSecret.substring(0, 6)}...`;

    const apiKey = this.apiKeysRepo.create({
      ...dto,
      organizationId,
      keyPrefix: displayPrefix,
      keyHash,
      keyType,
      environment,
      scopes: dto.scopes || ['*'],
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    const saved = await this.apiKeysRepo.save(apiKey);
    delete (saved as any).keyHash;

    return {
      apiKey: saved,
      secretKey: fullKey,
    };
  }

  async validateApiKey(rawKey: string): Promise<ApiKey> {
    const keyHash = this.hashKey(rawKey.trim());
    const apiKey = await this.apiKeysRepo.findOne({
      where: {
        keyHash,
        revokedAt: IsNull(),
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    if (apiKey.expiresAt && new Date() > new Date(apiKey.expiresAt)) {
      throw new UnauthorizedException('API key has expired');
    }

    // Update last used timestamp asynchronously
    apiKey.lastUsedAt = new Date();
    this.apiKeysRepo.save(apiKey).catch(() => {});

    return apiKey;
  }

  async findAll(organizationId: string): Promise<ApiKey[]> {
    const keys = await this.apiKeysRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    return keys.map((k) => {
      delete (k as any).keyHash;
      return k;
    });
  }

  async findById(organizationId: string, id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeysRepo.findOne({
      where: { id, organizationId },
    });
    if (!apiKey) {
      throw new NotFoundException(`API key not found with ID: ${id}`);
    }
    delete (apiKey as any).keyHash;
    return apiKey;
  }

  async revoke(
    organizationId: string,
    id: string,
  ): Promise<{ success: boolean }> {
    const apiKey = await this.findById(organizationId, id);
    apiKey.revokedAt = new Date();
    await this.apiKeysRepo.save(apiKey);
    return { success: true };
  }

  private getKeyPrefix(type: ApiKeyType, env: ApiKeyEnvironment): string {
    const typePrefix = type === ApiKeyType.PUBLISHABLE ? 'pk' : 'sk';
    const envPrefix = env === ApiKeyEnvironment.LIVE ? 'live' : 'test';
    return `${typePrefix}_${envPrefix}_`;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
