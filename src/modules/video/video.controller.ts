import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  @Get('token')
  async getToken(
    @Query('channelName') channelName: string,
    @Query('uid') uid: string,
  ) {
    // If Agora App ID is not set in env, use a default testing App ID.
    // For testing in Agora, developers can set their project's primary certificate to 'None' (Testing mode)
    // in the Agora Console, allowing any token or dummy strings.
    const appId = process.env.AGORA_APP_ID || 'mock-agora-app-id';
    
    // Simple mock token generation. In production, this would use 'agora-access-token' SDK 
    // to sign the channelName and uid using the AGORA_APP_CERTIFICATE.
    const token = `mock-token-for-channel-${channelName}-uid-${uid || '0'}`;

    return {
      appId,
      token,
      channelName,
      uid: uid || '0',
      message: 'Running in developer testing mode. Set app certificate to None in Agora Console to bypass signature check.',
    };
  }
}
