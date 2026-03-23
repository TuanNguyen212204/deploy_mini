import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformType } from '../entities/product.entity';

export enum SortOrder { ASC = 'ASC', DESC = 'DESC' }
export enum SortBy { PRICE = 'currentPrice', RATING = 'rating' }

export class SearchProductDto {
  @ApiPropertyOptional({ description: 'Từ khóa hoặc link sản phẩm' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: PlatformType, description: 'Lọc theo sàn' })
  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @ApiPropertyOptional({ description: 'Giá thấp nhất' })
  @IsOptional()
  @Type(() => Number) 
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Giá cao nhất' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.PRICE })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.PRICE;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  // PHÂN TRANG 
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}