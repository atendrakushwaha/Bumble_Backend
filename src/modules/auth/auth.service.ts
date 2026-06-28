import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  // A simple in-memory storage for pending OTPs (for production, use Redis or DB with TTL)
  private otpStore = new Map<string, { code: string; expiresAt: number }>();
  private googleClient = new OAuth2Client();

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    // Generate a 6-digit mock OTP code
    const code = '123456'; // Default mock OTP for testing
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    this.otpStore.set(phone, { code, expiresAt });

    // Mock sending SMS
    console.log(`[SMS MOCK] Sending OTP code ${code} to ${phone}`);

    return {
      success: true,
      message: `OTP sent successfully. For testing use code: ${code}`,
    };
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ token: string; user: UserDocument; isProfileComplete: boolean }> {
    if (!phone || !code) {
      throw new BadRequestException('Phone number and verification code are required');
    }

    const record = this.otpStore.get(phone);

    // For convenience of manual testing, we also allow the default mock code '123456' even if not in store
    if (code !== '123456') {
      if (!record) {
        throw new BadRequestException('No OTP sent to this phone number');
      }

      if (Date.now() > record.expiresAt) {
        this.otpStore.delete(phone);
        throw new BadRequestException('OTP code has expired');
      }

      if (record.code !== code) {
        throw new BadRequestException('Invalid OTP code');
      }
    }

    // Clear the OTP record after successful verification
    this.otpStore.delete(phone);

    // Find or create the user in the database
    let user = await this.userModel.findOne({ phone });
    let isProfileComplete = false;

    if (!user) {
      user = await this.userModel.create({
        phone,
        isVerified: false,
      });
    } else {
      // Check if user has completed minimum profile setup
      if (user.name && user.birthDate && user.gender && user.location && user.location.coordinates.length > 0) {
        isProfileComplete = true;
      }
    }

    // Generate JWT token
    const payload = { sub: user._id.toString(), phone: user.phone };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user,
      isProfileComplete,
    };
  }

  async verifyGoogleToken(
    idToken: string,
  ): Promise<{ token: string; user: UserDocument; isProfileComplete: boolean }> {
    if (!idToken) {
      throw new BadRequestException('Google ID token is required');
    }

    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;

    try {
      if (idToken === 'mock-google-token') {
        email = 'mockuser@gmail.com';
        name = 'Mock Google User';
        picture = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
      } else {
        const ticket = await this.googleClient.verifyIdToken({
          idToken,
        });
        const payload = ticket.getPayload();
        if (!payload) {
          throw new BadRequestException('Invalid Google ID token payload');
        }
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      }
    } catch (error) {
      throw new BadRequestException(`Google login failed: ${error.message}`);
    }

    if (!email) {
      throw new BadRequestException('Google ID token did not return an email');
    }

    let user = await this.userModel.findOne({ email });
    let isProfileComplete = false;

    if (!user) {
      // Create user
      user = await this.userModel.create({
        email,
        name,
        photos: picture ? [picture] : [],
        isVerified: false,
      });
    } else {
      if (
        user.name &&
        user.birthDate &&
        user.gender &&
        user.location &&
        user.location.coordinates.length > 0
      ) {
        isProfileComplete = true;
      }
    }

    // Generate JWT token
    const tokenPayload = { sub: user._id.toString(), email: user.email, phone: user.phone };
    const token = this.jwtService.sign(tokenPayload);

    return {
      token,
      user,
      isProfileComplete,
    };
  }
}
