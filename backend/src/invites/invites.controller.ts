import { Controller, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('invites')
export class InvitesController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('accept/:token')
  async acceptInvite(
    @Param('token') token: string,
    @GetUser() authUser: any,
  ) {
    const invite = await this.prisma.tripInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite');
    }

    if (invite.accepted) {
      throw new BadRequestException('Invite already accepted');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    // ensure user exists
    let user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.email,
        },
      });
    }

    // add member (ignore if already member)
    await this.prisma.tripMember.upsert({
      where: {
        tripId_userId: {
          tripId: invite.tripId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        tripId: invite.tripId,
        userId: user.id,
      },
    });

    await this.prisma.tripInvite.update({
      where: { id: invite.id },
      data: { accepted: true },
    });

    return { tripId: invite.tripId };
  }
}
