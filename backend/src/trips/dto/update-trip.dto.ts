import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateTripDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  tripName: string;
}