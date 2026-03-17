import { CloudinaryConfig } from './config/cloudinary.config';
import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './services/cloudinary.service';

@Global()
@Module({
  providers: [CloudinaryConfig, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
