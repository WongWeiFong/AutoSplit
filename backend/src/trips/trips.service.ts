import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getMyTrips(userId: string) {
    return this.prisma.trip.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      select: {
        id: true,
        tripName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
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


  async addMember(tripId: string, userId: string) {
    return this.prisma.tripMember.create({
      data: { tripId, userId },
    })
  }

  async getTripsForUser(userId: string) {
    return this.prisma.trip.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        bills: true,
        members: {
          include: { user: true },
        },
      },
    })
  }
}
