import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { MailService } from '../email/email.service';


@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly mailService: MailService) {}

  async createTrip(authUser: any, tripName: string) {
    const userId = authUser.id;      // works for Google + email
    const email = authUser.email;
  
    if (!userId) {
      throw new Error('Authenticated user missing id');
    }

    let user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
  
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: userId,
          email,
          name: authUser.user_metadata?.full_name || authUser.email,
        },
      });
    }
  
    // now create the trip safely
    return this.prisma.trip.create({
      data: {
        tripName,
        createdBy: user.id,
        members: {
          create: [{ userId: user.id }],
        },
      },
    });
  }

  async getTrip(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check if user is a member
    const isMember = await this.prisma.tripMember.findFirst({
      where: { tripId, userId },
    });

    if (!isMember) {
      throw new ForbiddenException('Not a member of this trip');
    }

    return trip;
  }

  async updateTrip(tripId: string, userId: string, tripName: string) {
    await this.checkOwnership(tripId, userId);
    return this.prisma.trip.update({
      where: { id: tripId },
      data: { tripName },
    })
  }

  async deleteTrip(tripId: string, userId: string) {
    await this.checkOwnership(tripId, userId);
    return this.prisma.trip.delete({
      where: { id: tripId },
    })
  }

  async getTripBalances(tripId: string) {
    const bills = await this.prisma.bill.findMany({
      where: { tripId },
      include: {
        splits: true, // What each person owes for this bill
      }
    });
    const balances: Record<string, number> = {}; // userId -> net amount
    bills.forEach(bill => {
      // The payer is "out of pocket" by the total amount
      balances[bill.paidById] = (balances[bill.paidById] || 0) + Number(bill.totalAmount);
      // Each person in the split "owes" their share
      bill.splits.forEach(split => {
        balances[split.userId] = (balances[split.userId] || 0) - Number(split.amount);
      });
    });
  
    return balances;
  }

  async getTripMembers(tripId: string) {
    return this.prisma.tripMember.findMany({
      where: { tripId },
      include: { user: true }
    });
  }

  async checkOwnership(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    })
    if (!trip) {
      throw new NotFoundException('Trip not found')
    }
    if (trip.createdBy !== userId) {
      throw new ForbiddenException('You do not have permission to modify this trip');
  }
}

  // GET /trips/:tripId/bills
  async getTripBills(userId: string, tripId: string) {
    const member = await this.prisma.tripMember.findFirst({
      where: { tripId, userId }
    })

    if (!member) {
      throw new ForbiddenException('Not a member of this trip')
    }

    return this.prisma.bill.findMany({
      where: { tripId },
      select: {
        id: true,
        title: true,
        merchantName: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async addMemberByEmail(tripId: string, email: string) {
    // 1. find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
  
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    // 2. prevent duplicates
    const existing = await this.prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId: user.id,
        },
      },
    });
  
    if (existing) {
      throw new ForbiddenException('User already in trip');
    }
  
    // 3. create membership
    return this.prisma.tripMember.create({
      data: {
        tripId,
        userId: user.id,
      },
    });
  }  

  async inviteMember(
    tripId: string,
    inviterId: string,
    email: string,
  ) {
    // Only owner can invite
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });
  
    if (!trip || trip.createdBy !== inviterId) {
      throw new ForbiddenException('Only owner can invite members');
    }
  
    const token = randomUUID();
  
    const invite = await this.prisma.tripInvite.create({
      data: {
        tripId,
        email,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
      },
    });
  
    const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;
  
    await this.mailService.sendInvite(email, inviteLink);
  
    return { success: true };
  }

  async removeMember(tripId: string, ownerId: string, memberId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });
  
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
  
    if (trip.createdBy !== ownerId) {
      throw new ForbiddenException('Only owner can manage members');
    }
  
    if (trip.createdBy === memberId) {
      throw new ForbiddenException('Owner cannot be removed');
    }
  
    // return this.prisma.tripMember.update({
    //   where: {
    //     tripId_userId: {
    //       tripId,
    //       userId: targetUserId,
    //     },
    //   },
    //   data: {
    //     leftAt: new Date(), // soft remove
    //   },
    // });
    const member = await this.prisma.tripMember.findFirst({
      where: { tripId, userId: memberId },
    });
  
    if (!member) {
      throw new NotFoundException('Member not found');
    }
  
    return this.prisma.tripMember.delete({
      where: { id: member.id },
    });
  }
  
  async transferOwnership(tripId: string, ownerId: string, newOwnerId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });
  
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
  
    if (trip.createdBy !== ownerId) {
      throw new ForbiddenException('Only owner can transfer ownership');
    }
  
    // Ensure new owner is a member
    const member = await this.prisma.tripMember.findFirst({
      where: { tripId, userId: newOwnerId },
    });
  
    if (!member) {
      throw new ForbiddenException('New owner must be a trip member');
    }
  
    return this.prisma.trip.update({
      where: { id: tripId },
      data: { createdBy: newOwnerId },
    });
  }

  async getTripsForUser(userId: string) {
    return this.prisma.trip.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      select: {
        id: true,
        tripName: true,
        createdAt: true,
        createdBy: true,
        _count: {
          select: { bills: true }
        },
        members: {
          include: { user: true },
        },
      },
    })
  }
}
