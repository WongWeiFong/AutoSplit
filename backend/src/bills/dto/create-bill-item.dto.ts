// export class CreateBillItemDto {
//     name: string;
//     quantity?: number;
//     unitPrice?: number;
//     totalPrice?: number;
//     description?: string;
//   }
  
import { IsArray, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateParticipantDto } from './create-participant.dto';

export class CreateBillItemDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  totalPrice: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParticipantDto)
  participants: CreateParticipantDto[];
}
