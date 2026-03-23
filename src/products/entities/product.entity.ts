import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn,
    Index 
  } from 'typeorm';
  
  // Khai báo các sàn được phép (Tránh nhập sai chính tả)
  export enum PlatformType {
    SHOPEE = 'Shopee',
    LAZADA = 'Lazada',
    TIKTOK = 'TikTok',
  }
  
  @Entity('products')
  export class Product {
    // 1. ID của sản phẩm
    @PrimaryGeneratedColumn()
    id: number;

  
    // 2. Tên sản phẩm 
    @Column({ type: 'varchar', length: 255 })
    name: string; 
  
    // 3. Link gốc của sản phẩm 
    @Column({ type: 'text', unique: true })
    url: string; 
  
    // 4. Link ảnh sản phẩm
    @Column({ type: 'text', nullable: true })
    imageUrl: string; 
  
    // 5. Giá hiện tại 
    @Index() 
    @Column({ type: 'int', default: 0 })
    currentPrice: number; 
  
    // 6. Nền tảng (Shopee/Lazada/TikTok)
    @Index()
    @Column({ type: 'enum', enum: PlatformType, default: PlatformType.SHOPEE })
    platform: PlatformType;
    // Đánh giá sao (từ 0.0 đến 5.0)
    @Index() 
    @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
    rating: number;

  // Số lượng lượt đánh giá 
  @Column({ type: 'int', default: 0 })
  reviewsCount: number;
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
    // 7. Thời gian tạo và cập nhật
    @CreateDateColumn()
    createdAt: Date; 
  
    @UpdateDateColumn()
    updatedAt: Date; 
    
  }