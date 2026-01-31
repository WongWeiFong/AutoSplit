import {IsString, MinLength } from 'class-validator';

export class CreateTripDto {
    @IsString()
    @MinLength(3)l
    tripName: string;

    @IsString()
    createdBy: string;
}