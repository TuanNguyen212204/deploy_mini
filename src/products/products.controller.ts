import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ProductsService } from './products.service';
import { BulkCreateProductDto } from './dto/bulk-create-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  //  INGESTION API
  @Post('bulk')
  @ApiOperation({ summary: 'Nhận dữ liệu từ Crawler (upsert)' })
  async bulkCreate(@Body() bulkDto: BulkCreateProductDto) {
    try {
      await this.productsService.upsertBulk(bulkDto.products);
      return { 
        message: `Đã xử lý thành công ${bulkDto.products.length} sản phẩm`, 
        success: true 
      };
    } catch (error) {
      console.error('Bulk insert error:', error);
      throw new BadRequestException({
        message: 'Lỗi khi lưu dữ liệu',
        error: error.message
      });
    }
  }

  //TÌM KIẾM SẢN PHẨM 
  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm, lọc và sắp xếp sản phẩm' })
  async search(@Query() filter: SearchProductDto) {
    return this.productsService.searchProducts(filter);
  }
}