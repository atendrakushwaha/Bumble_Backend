import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('otp/send')
  async sendOtp(@Body('phone') phone: string) {
    return this.authService.sendOtp(phone);
  }

  @Post('otp/verify')
  async verifyOtp(
    @Body('phone') phone: string,
    @Body('code') code: string,
  ) {
    return this.authService.verifyOtp(phone, code);
  }

  @Post('google')
  async verifyGoogleToken(@Body('idToken') idToken: string) {
    return this.authService.verifyGoogleToken(idToken);
  }
}
