// import { CreateSplitRuleDto } from './create-split-rule.dto';

// export class CreateParticipantDto {
//   userId?: string;
//   displayName: string;
//   splitRules?: CreateSplitRuleDto[];
// }

import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSplitRuleDto } from './create-split-rule.dto';

export class CreateParticipantDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  displayName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSplitRuleDto)
  splitRules: CreateSplitRuleDto[];
}
