import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchService } from './match.service';

@Controller('match')
@UseGuards(JwtAuthGuard)
export class MatchController {
  constructor(private matchService: MatchService) {}

  @Get('cards')
  async getSwipeCards(@Req() req: any) {
    return this.matchService.getSwipeCards(req.user);
  }

  @Post('swipe')
  async swipe(
    @Req() req: any,
    @Body('targetUserId') targetUserId: string,
    @Body('action') action: string,
  ) {
    return this.matchService.swipe(req.user, targetUserId, action);
  }

  @Get('list')
  async getMatches(@Req() req: any) {
    return this.matchService.getMatches(req.user);
  }
}
