import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTrip(userId: string, tripName: string) {
    return this.prisma.trip.create({
      data: {
        tripName,
        createdBy: userId,
        members: {
          create: [{ userId }],
        },
      },
    })
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
