// src/modules/api-keys/api-keys.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKey, ApiKeyType, ApiKeyEnvironment } from './entities/api-key.entity';

describe('ApiKeysService', () => {
    let service: ApiKeysService;
    let repo: any;

    beforeEach(async () => {
        repo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'mock-key-uuid', ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            findOne: jest.fn(),
            find: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeysService,
                { provide: getRepositoryToken(ApiKey), useValue: repo },
            ],
        }).compile();

        service = module.get<ApiKeysService>(ApiKeysService);
    });

    it('should generate a hashed secret live key starting with sk_live_', async () => {
        const result = await service.create('mock-org-uuid', {
            name: 'Production E-Commerce Key',
            keyType: ApiKeyType.SECRET,
            environment: ApiKeyEnvironment.LIVE,
        });

        expect(result.secretKey).toMatch(/^sk_live_[a-f0-9]{48}$/);
        expect(result.apiKey.keyPrefix).toMatch(/^sk_live_/);
        expect(repo.save).toHaveBeenCalled();
    });

    it('should generate a publishable test key starting with pk_test_', async () => {
        const result = await service.create('mock-org-uuid', {
            name: 'Sandbox POS Key',
            keyType: ApiKeyType.PUBLISHABLE,
            environment: ApiKeyEnvironment.TEST,
        });

        expect(result.secretKey).toMatch(/^pk_test_[a-f0-9]{48}$/);
    });
});
