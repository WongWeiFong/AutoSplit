// import { CreateBillItemDto } from './create-bill-item.dto';
// import { CreateParticipantDto } from './create-participant.dto';

// export class CreateBillDto {
//   title: string;
//   merchantName?: string;
//   totalAmount?: number;
//   items: CreateBillItemDto[];
//   participants?: CreateParticipantDto[];
// }

import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBillItemDto } from './create-bill-item.dto';
import { CreateParticipantDto } from './create-participant.dto';

export class CreateBillDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  merchantName?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items: CreateBillItemDto[];

  @IsArray()
  participants: CreateParticipantDto[];
}
