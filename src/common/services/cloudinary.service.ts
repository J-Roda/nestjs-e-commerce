import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  // UPLOAD IMAGE
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'ecommerce',
  ): Promise<{ url: string; publicId: string }> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // validate file size — max 2MB
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Image must be less than 2MB');
    }

    return new Promise((resolve, reject) => {
      // upload stream — converts buffer to readable stream for Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder, // organizes images in Cloudinary
          transformation: [
            { width: 1000, crop: 'limit' }, // max width 1000px
            { quality: 'auto' }, // auto optimize quality
            { fetch_format: 'auto' }, // auto convert to webp etc.
          ],
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            reject(new BadRequestException('Image upload failed'));
          } else {
            resolve({
              url: result.secure_url, // https URL to the image
              publicId: result.public_id, // needed for deletion later
            });
          }
        },
      );

      // convert buffer to stream and pipe to Cloudinary
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  // ─────────────────────────────────────
  // UPLOAD MULTIPLE IMAGES
  // ─────────────────────────────────────
  async uploadImages(
    files: Express.Multer.File[],
    folder: string = 'ecommerce',
  ): Promise<{ url: string; publicId: string }[]> {
    // upload all images in parallel
    return Promise.all(files.map(file => this.uploadImage(file, folder)));
  }

  // ─────────────────────────────────────
  // DELETE IMAGE
  // ─────────────────────────────────────
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  // ─────────────────────────────────────
  // DELETE MULTIPLE IMAGES
  // ─────────────────────────────────────
  async deleteImages(publicIds: string[]): Promise<void> {
    await Promise.all(publicIds.map(publicId => this.deleteImage(publicId)));
  }
}
