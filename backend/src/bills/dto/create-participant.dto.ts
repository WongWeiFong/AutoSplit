
// export class CreateParticipantDto {
//   userId?: string;
//   displayName: string;
//   billSplit?: CreateBillSplitDto[];
// }

import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBillSplitDto } from './create-bill-split.dto';

export class CreateParticipantDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  displayName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillSplitDto)
  billSplit: CreateBillSplitDto[];
}
