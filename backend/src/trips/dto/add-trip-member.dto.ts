import { IsEmail } from "class-validator";

export class AddTripMemberDto {
    @IsEmail()
    email: string;
}