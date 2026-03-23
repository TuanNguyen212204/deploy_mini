import { IsString, IsUrl, IsNumber, IsEnum, Min, IsOptional } from 'class-validator';
import { PlatformType } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsUrl({ require_protocol: true })
  url: string;                   

  @IsUrl({ require_protocol: true })
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  currentPrice: number;

  @IsEnum(PlatformType)
  platform: PlatformType;

  // @IsNumber()
  // @IsOptional()
  // originalPrice?: number;

  // @IsOptional()
  // metadata?: any;                  // rating, shippingFee, etc.
}