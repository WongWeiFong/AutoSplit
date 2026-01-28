import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBillSplitDto {

  @IsString()
  userId: string;

  @IsUUID()
  billItemId: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}