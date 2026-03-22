import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  async searchProducts(keyword: string): Promise<Product[]> {
    // Nếu người dùng không nhập gì, trả về 10 sản phẩm mới nhất
    if (!keyword) {
      return this.productRepository.find({ 
        take: 10,
        order: { createdAt: 'DESC' }
      });
    }

    return this.productRepository.find({
      where: {
        name: ILike(`%${keyword}%`), 
      },
      take: 20, 
    });
  }
}