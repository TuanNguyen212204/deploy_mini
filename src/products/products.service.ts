import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { SearchProductDto, SortBy, SortOrder } from './dto/search-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

 //INGESTION API 
async upsertBulk(products: CreateProductDto[]): Promise<void> {
  console.log(` Đang xử lý ${products.length} sản phẩm...`);

  for (const dto of products) {
    try {
      // Tìm theo url 
      let existing = await this.productRepository.findOne({ where: { url: dto.url } });

      if (existing) {
        existing.currentPrice = dto.currentPrice;
        //existing.originalPrice = dto.originalPrice ?? existing.originalPrice;
        existing.imageUrl = dto.imageUrl ?? existing.imageUrl;
        existing.metadata = dto.metadata ?? existing.metadata;
        existing.platform = dto.platform;
        existing.updatedAt = new Date();  

        await this.productRepository.save(existing);
        console.log(` Updated: ${dto.name}`);
      } else {
        const newProduct = this.productRepository.create(dto);
        await this.productRepository.save(newProduct);
        console.log(` Inserted: ${dto.name}`);
      }
    } catch (error) {
      console.error(` Lỗi khi xử lý sản phẩm ${dto.name}:`, error.message);
      throw error;   
    }
  }
}
  async searchProducts(filter: SearchProductDto) {
    const { 
      keyword, 
      platform, 
      minPrice, 
      maxPrice, 
      sortBy = 'currentPrice', 
      sortOrder = 'ASC', 
      page = 1, 
      limit = 20 
    } = filter;

    const query = this.productRepository.createQueryBuilder('product');


    if (keyword) {
      if (keyword.startsWith('http')) {
        query.andWhere('product.url = :url', { url: keyword });
      } else {
        query.andWhere('product.name ILIKE :keyword', { keyword: `%${keyword}%` });
      }
    }

    if (platform) {
      query.andWhere('product.platform = :platform', { platform });
    }
    if (minPrice) {
      query.andWhere('product.currentPrice >= :minPrice', { minPrice });
    }
    if (maxPrice) {
      query.andWhere('product.currentPrice <= :maxPrice', { maxPrice });
    }

    query.orderBy(`product.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total, 
        currentPage: page, 
        totalPages: Math.ceil(total / limit), 
        itemsPerPage: limit, 
      },
    };
  }
}