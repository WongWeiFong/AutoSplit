// export class CreateSplitRuleDto {
//     type: 'EQUAL' | 'CUSTOM';
//     amount?: number;
//   }
  
  import { IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';

export enum SplitType {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
}

export class CreateSplitRuleDto {
  @IsUUID()
  participantId: string;

  @IsUUID()
  billItemId: string;

  @IsEnum(SplitType)
  type: SplitType;

  @IsOptional()
  @IsNumber()
  amount?: number;
}