import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAddress } from './entities/customer-address.entity.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';

@Injectable()
export class CustomerAddressService {
  constructor(
    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,
    private readonly auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateAddressDto): Promise<CustomerAddress> {
    if (dto.isDefault) {
      await this.clearDefault(userId);
    } else {
      // If this is the user's first address, make it default automatically
      const count = await this.addressRepo.count({ where: { userId } });
      if (count === 0) {
        dto.isDefault = true;
      }
    }

    const address = this.addressRepo.create({
      ...dto,
      userId,
      country: dto.country || 'FI',
    });

    const saved = await this.addressRepo.save(address);

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.CUSTOMER_ADDRESS_CREATED,
      resource: 'customer_address',
      resourceId: saved.id,
      metadata: { city: saved.city, postalCode: saved.postalCode },
    });

    return saved;
  }

  async findAllForUser(userId: string): Promise<CustomerAddress[]> {
    return this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }


  async findOneForUser(id: string, userId: string): Promise<CustomerAddress> {
    const address = await this.addressRepo.findOne({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    return address;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateAddressDto,
  ): Promise<CustomerAddress> {
    const address = await this.findOneForUser(id, userId);

    if (dto.isDefault) {
      await this.clearDefault(userId);
    }

    Object.assign(address, dto);
    const updated = await this.addressRepo.save(address);

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.CUSTOMER_ADDRESS_UPDATED,
      resource: 'customer_address',
      resourceId: id,
      metadata: { city: updated.city, postalCode: updated.postalCode },
    });

    return updated;
  }

  async setDefault(id: string, userId: string): Promise<CustomerAddress> {
    const address = await this.findOneForUser(id, userId);
    await this.clearDefault(userId);
    address.isDefault = true;
    return this.addressRepo.save(address);
  }

  async remove(id: string, userId: string): Promise<void> {
    const address = await this.findOneForUser(id, userId);
    await this.addressRepo.remove(address);

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.CUSTOMER_ADDRESS_DELETED,
      resource: 'customer_address',
      resourceId: id,
    });
  }

  private async clearDefault(userId: string): Promise<void> {
    await this.addressRepo.update({ userId, isDefault: true }, { isDefault: false });
  }
}
