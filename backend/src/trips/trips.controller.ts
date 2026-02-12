import { Body, Controller, Get, Post, Req, UseGuards, Param, Put, Patch, Delete } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { AddTripMemberDto } from './dto/add-trip-member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('trips')
@UseGuards(SupabaseAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}
   
  @Get()
  getMyTrips(@GetUser('id') userId: string) {
    return this.tripsService.getMyTrips(userId)
  }

  @Post()
  createTrip(@Req() req, @Body() dto: CreateTripDto ) {
    return this.tripsService.createTrip(req.user, dto.tripName)
  }

  @Get(':id')
  async getTrip(
    @GetUser('id') userId: string,
    @Param('id') tripId: string
  ) {
    return this.tripsService.getTrip(userId, tripId);
  }

  @Patch(':id')
  updateTrip(
    @GetUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: UpdateTripDto // Use DTO here
  ) {
    return this.tripsService.updateTrip(userId, tripId, dto.tripName);
  }

  @Delete(':id')
  deleteTrip(
    @GetUser('id') userId: string,
    @Param('id') tripId: string) {
    return this.tripsService.deleteTrip(userId, tripId)
  }

  @Get(':tripId/bills')
  getTripBills(
    @GetUser('id') userId: string,
    @Param('tripId') tripId: string
  ) {
    return this.tripsService.getTripBills(userId, tripId)
  }

  @Get(':tripId/members')
  getTripMembers(@Param('tripId') tripId: string) {
    return this.tripsService.getTripMembers(tripId)
  }

  @Post(':tripId/invite')
  inviteMember(
    @Param('tripId') tripId: string,
    @Req() req,
    @Body() dto: InviteMemberDto,
  ) {
    return this.tripsService.inviteMember(
      tripId,
      req.user.id,
      dto.email,
    );
  }

  @Post(':tripId/transfer-ownership')
  transferOwnership(
    @Req() req,
    @Param('tripId') tripId: string,
    @Body() body: { newOwnerId: string },
  ) {
    return this.tripsService.transferOwnership(
      tripId,
      req.user.id,
      body.newOwnerId,
    );
  }


  @Delete(':tripId/members/:memberId')
  removeMember(
    @Req() req,
    @Param('tripId') tripId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.tripsService.removeMember(tripId, req.user.id, memberId);
  }


  @Post(':tripId/members')
  addTripMember(
    @Param('tripId') tripId: string, 
    @Body('email') email: string) {
    return this.tripsService.addMemberByEmail(
      tripId, 
      email
    )
  }
  
  @Get(':tripId/balances')
  async getTripBalances(
    @GetUser('id') userId: string,
    @Param('tripId') tripId: string
  ) {
    return this.tripsService.getTripBalances(tripId)
  }

  @Get()
  findMyTrips(@Req() req) {
    return this.tripsService.getTripsForUser(req.user.id)
  }
}
