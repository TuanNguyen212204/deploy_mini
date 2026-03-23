import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

 //INGESTION API 
async upsertBulk(products: CreateProductDto[]): Promise<void> {
  console.log(`🔄 Đang xử lý ${products.length} sản phẩm...`);

  for (const dto of products) {
    try {
      // Tìm theo url (unique key)
      let existing = await this.productRepository.findOne({ where: { url: dto.url } });

      if (existing) {
        existing.currentPrice = dto.currentPrice;
        //existing.originalPrice = dto.originalPrice ?? existing.originalPrice;
        existing.imageUrl = dto.imageUrl ?? existing.imageUrl;
        //existing.metadata = dto.metadata ?? existing.metadata;
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
  // TÌM KIẾM SẢN PHẨM 
  async searchProducts(keyword: string): Promise<Product[]> {
    if (!keyword) {
      return this.productRepository.find({
        take: 20,
        order: { createdAt: 'DESC' },
      });
    }
    // Nếu người dùng dán LINK → tìm chính xác theo url
    if (keyword.startsWith('http')) {
      return this.productRepository.find({
        where: { url: keyword },
        take: 1,
      });
    }
    // Tìm theo tên 
    return this.productRepository.find({
      where: { name: ILike(`%${keyword}%`) },
      take: 30,
      order: { currentPrice: 'ASC' },
    });
  }
}