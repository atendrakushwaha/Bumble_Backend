import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Match, MatchDocument } from '../../schemas/match.schema';

@Injectable()
export class MatchService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
  ) {}

  async getSwipeCards(currentUser: UserDocument): Promise<UserDocument[]> {
    const now = new Date();

    // 1. Get IDs of users already swiped on
    const swipedMatches = await this.matchModel.find({ user1: currentUser._id });
    const swipedUserIds = swipedMatches.map(m => m.user2);
    
    // Add current user to exclusions
    swipedUserIds.push(currentUser._id);

    // 2. Build Geo Query
    const query: any = {
      _id: { $nin: swipedUserIds },
    };

    // Location query
    if (currentUser.location && currentUser.location.coordinates) {
      const maxDistanceMeters = (currentUser.distancePreference || 50) * 1000;
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: currentUser.location.coordinates,
          },
          $maxDistance: maxDistanceMeters,
        },
      };
    }

    // 3. Gender preference filtering
    if (currentUser.genderPreference && currentUser.genderPreference !== 'everyone') {
      if (currentUser.genderPreference === 'both') {
        query.gender = { $in: ['male', 'female'] };
      } else {
        query.gender = currentUser.genderPreference;
      }
    }

    // Match gender preferences of others (they must be willing to match with current user's gender)
    query.genderPreference = { $in: [currentUser.gender, 'both', 'everyone'] };

    // 4. Age range query (Convert min/max age to birthDate limits)
    const minAge = currentUser.agePreference?.min || 18;
    const maxAge = currentUser.agePreference?.max || 50;

    const maxBirthDate = new Date();
    maxBirthDate.setFullYear(now.getFullYear() - minAge); // Youngest allowed (e.g. 18 years ago)

    const minBirthDate = new Date();
    minBirthDate.setFullYear(now.getFullYear() - maxAge - 1); // Oldest allowed (e.g. 51 years ago)

    query.birthDate = {
      $gte: minBirthDate,
      $lte: maxBirthDate,
    };

    // 5. Language preference filtering
    if (currentUser.preferredLanguages && currentUser.preferredLanguages.length > 0) {
      query.languages = { $in: currentUser.preferredLanguages };
    }

    // Limit to 20 potential cards per request
    const cards = await this.userModel.find(query).limit(20);
    return cards;
  }

  async swipe(
    currentUser: UserDocument,
    targetUserId: string,
    action: string,
  ): Promise<{ isMatch: boolean; matchRecord: MatchDocument }> {
    if (!['like', 'pass', 'superlike'].includes(action)) {
      throw new BadRequestException('Invalid swipe action. Must be: like, pass, or superlike');
    }

    const targetUserObjectId = new Types.ObjectId(targetUserId);

    // Verify target user exists
    const targetUser = await this.userModel.findById(targetUserId);
    if (!targetUser) {
      throw new BadRequestException('Target user does not exist');
    }

    // Check if swipe already exists
    let matchRecord = await this.matchModel.findOne({
      user1: currentUser._id,
      user2: targetUserObjectId,
    });

    if (matchRecord) {
      throw new BadRequestException('Already swiped on this user');
    }

    // Create the swipe record
    matchRecord = new this.matchModel({
      user1: currentUser._id,
      user2: targetUserObjectId,
      action,
      isMutual: false,
    });

    let isMatch = false;

    // Check for a mutual match if current user liked/superliked
    if (action === 'like' || action === 'superlike') {
      const reverseMatch = await this.matchModel.findOne({
        user1: targetUserObjectId,
        user2: currentUser._id,
        action: { $in: ['like', 'superlike'] },
      });

      if (reverseMatch) {
        // It's a match! Update both records
        isMatch = true;
        matchRecord.isMutual = true;
        await matchRecord.save();

        reverseMatch.isMutual = true;
        await reverseMatch.save();
      } else {
        await matchRecord.save();
      }
    } else {
      await matchRecord.save();
    }

    return {
      isMatch,
      matchRecord,
    };
  }

  async getMatches(currentUser: UserDocument): Promise<UserDocument[]> {
    // Return list of user profiles that are mutual matches with the current user
    const matches = await this.matchModel.find({
      user1: currentUser._id,
      isMutual: true,
    });

    const matchedUserIds = matches.map(m => m.user2);
    return this.userModel.find({ _id: { $in: matchedUserIds } });
  }
}
