import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from './entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryStatus } from './enums/category-status.enum.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  /**
   * Retrieve the full platform-wide category tree (top-level + children)
   */
  async findTree(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { parentId: IsNull() },
      relations: { children: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Retrieve a flat list of all categories (with optional status filter)
   */
  async findAll(status?: CategoryStatus): Promise<Category[]> {
    const where = status ? { status } : {};
    return this.categoryRepo.find({
      where,
      relations: { parent: true, children: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Find a single category by ID
   */
  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: { parent: true, children: true },
    });
    if (!category) {
      throw new NotFoundException(`Category "${id}" not found`);
    }
    return category;
  }

  /**
   * Platform Admin: Create a new category
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    // Validate unique name
    const exists = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (exists) {
      throw new ConflictException(`Category with name "${dto.name}" already exists`);
    }

    // Validate parent
    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(`Parent category "${dto.parentId}" not found`);
      }
      // Prevent deep nesting (max 2 levels: parent → child)
      if (parent.parentId) {
        throw new BadRequestException('Categories can only be nested one level deep (parent → subcategory)');
      }
    }

    const slug = await this.generateUniqueSlug(dto.name);

    const category = this.categoryRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      imageUrl: dto.imageUrl ?? null,
      parentId: dto.parentId ?? null,
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? CategoryStatus.ACTIVE,
    });

    return this.categoryRepo.save(category);
  }

  /**
   * Platform Admin: Update a category
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    // Check name uniqueness if changing name
    if (dto.name && dto.name !== category.name) {
      const nameConflict = await this.categoryRepo.findOne({ where: { name: dto.name } });
      if (nameConflict) {
        throw new ConflictException(`Category with name "${dto.name}" already exists`);
      }
      category.slug = await this.generateUniqueSlug(dto.name, id);
      category.name = dto.name;
    }

    // Prevent self-reference as parent
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
        if (!parent) {
          throw new NotFoundException(`Parent category "${dto.parentId}" not found`);
        }
        if (parent.parentId) {
          throw new BadRequestException('Categories can only be nested one level deep');
        }
      }
      category.parentId = dto.parentId ?? null;
    }

    if (dto.description !== undefined) category.description = dto.description ?? null;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl ?? null;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) category.status = dto.status;

    return this.categoryRepo.save(category);
  }

  /**
   * Platform Admin: Delete a category (must have no children and no active products)
   */
  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findOne(id);

    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it has ${category.children.length} subcategory(ies). Remove them first.`,
      );
    }

    await this.categoryRepo.remove(category);
    return { message: `Category "${category.name}" deleted successfully` };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 1;

    while (true) {
      const qb = this.categoryRepo.createQueryBuilder('c').where('c.slug = :slug', { slug });
      if (excludeId) {
        qb.andWhere('c.id != :id', { id: excludeId });
      }
      const existing = await qb.getOne();
      if (!existing) break;
      slug = `${base}-${counter++}`;
    }

    return slug;
  }
}
