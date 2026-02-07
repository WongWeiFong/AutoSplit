import { Body, Controller, Get, Post, Req, UseGuards, Param, Put, Patch, Delete } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { AddTripMemberDto } from './dto/add-trip-member.dto';
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

  // @Put(':tripId')
  // updateTrip(@Param('tripId') tripId: string, @Body() dto: UpdateTripDto) {
  //   return this.tripsService.updateTrip(tripId, dto.tripName)
  // }

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

  @Post(':tripId/members')
  addTripMember(@Param('tripId') tripId: string, @Body() dto: AddTripMemberDto) {
    return this.tripsService.addMember(tripId, dto.userId)
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
