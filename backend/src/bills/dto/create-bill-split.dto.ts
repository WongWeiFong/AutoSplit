import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateBillSplitDto {
  @IsUUID()
  participantId: string;

  @IsUUID()
  billItemId: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}