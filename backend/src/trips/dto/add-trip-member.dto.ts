import { IsString } from "class-validator";

export class AddTripMemberDto {
    @IsString()
    userId: string;
}