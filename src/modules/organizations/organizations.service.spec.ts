// src/modules/organizations/organizations.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import {
  Organization,
  OrganizationStatus,
} from './entities/organization.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'mock-org-uuid', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: repo },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an organization with generated slug', async () => {
    repo.findOne.mockResolvedValue(null);

    const result = await service.create({
      name: 'Sydney Crypto Cafe',
      defaultCurrency: 'AUD',
    });

    expect(result.name).toBe('Sydney Crypto Cafe');
    expect(result.slug).toContain('sydney-crypto-cafe');
    expect(result.status).toBe(OrganizationStatus.ACTIVE);
  });

  it('should get or create default organization for merchant', async () => {
    repo.findOne.mockResolvedValue(null);

    const result = await service.getOrCreateForMerchant({
      id: 'merchant-uuid-1234',
      businessName: 'Bondi Beach Bar',
      email: 'bondi@example.com',
    });

    expect(result.name).toBe('Bondi Beach Bar');
    expect(repo.save).toHaveBeenCalled();
  });
});
