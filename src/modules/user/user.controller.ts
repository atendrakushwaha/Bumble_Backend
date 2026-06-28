import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { User } from '../../schemas/user.schema';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user._id);
  }

  @Put('me')
  async updateProfile(@Req() req: any, @Body() updateData: Partial<User>) {
    return this.userService.updateProfile(req.user._id, updateData);
  }

  @Post('me/photos')
  @UseInterceptors(
    FilesInterceptor('files', 6, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `profile-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(new BadRequestException('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadPhotos(@Req() req: any, @UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    const photoUrls = files.map(file => `/uploads/${file.filename}`);
    return this.userService.uploadPhotoUrls(req.user._id, photoUrls);
  }

  @Delete('me/photos/:index')
  async deletePhoto(@Req() req: any, @Param('index') index: string) {
    return this.userService.deletePhoto(req.user._id, parseInt(index, 10));
  }
}
