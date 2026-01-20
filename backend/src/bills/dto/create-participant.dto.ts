import { CreateSplitRuleDto } from './create-split-rule.dto';

export class CreateParticipantDto {
  userId?: string;
  displayName: string;
  splitRules?: CreateSplitRuleDto[];
}
