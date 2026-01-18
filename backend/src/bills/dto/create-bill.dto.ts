import { CreateBillItemDto } from './create-bill-item.dto';
import { CreateParticipantDto } from './create-participant.dto';

export class CreateBillDto {
  title: string;
  merchantName?: string;
  totalAmount?: number;
  items: CreateBillItemDto[];
  participants?: CreateParticipantDto[];
}
