import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getProfile(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateData: Partial<User>): Promise<UserDocument> {
    // If coordinates are updated, format them correctly as GeoJSON
    const formattedData = { ...updateData };
    if (updateData.location && Array.isArray(updateData.location.coordinates)) {
      formattedData.location = {
        type: 'Point',
        coordinates: [
          Number(updateData.location.coordinates[0]), // Longitude
          Number(updateData.location.coordinates[1]), // Latitude
        ],
      };
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: formattedData },
      { new: true },
    );

    if (!updatedUser) {
      throw new NotFoundException('User profile not found');
    }
    return updatedUser;
  }

  async uploadPhotoUrls(userId: string, photoUrls: string[]): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $push: { photos: { $each: photoUrls } } },
      { new: true },
    );
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  async deletePhoto(userId: string, index: number): Promise<UserDocument> {
    const user = await this.getProfile(userId);
    if (index >= 0 && index < user.photos.length) {
      user.photos.splice(index, 1);
      await user.save();
    }
    return user;
  }
}
