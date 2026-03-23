import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ProductsService } from './products.service';
import { BulkCreateProductDto } from './dto/bulk-create-product.dto';
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
  @ApiOperation({ summary: 'Tìm kiếm sản phẩm (từ khóa hoặc dán link)' })
  async search(@Query('keyword') keyword: string) {
    return this.productsService.searchProducts(keyword);
  }
}