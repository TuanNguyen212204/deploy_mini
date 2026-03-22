import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products') 
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Tạo API tìm kiếm
  @Get('search')
  async search(@Query('keyword') keyword: string) {
    return this.productsService.searchProducts(keyword);
  }
}
