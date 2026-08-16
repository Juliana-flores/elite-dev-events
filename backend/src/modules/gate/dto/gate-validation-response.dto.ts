import { ApiProperty } from '@nestjs/swagger';

import { TicketStatus } from '../../tickets/enums/ticket-status.enum';
import { GateValidationResult } from '../enums/gate-validation-result.enum';

export class GateTicketSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.USED,
    required: false,
  })
  status?: TicketStatus;

  @ApiProperty({
    example: '2026-09-20T21:45:12.000Z',
    nullable: true,
    required: false,
  })
  validatedAt?: Date | null;
}

export class GateEventSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Interstellar' })
  title!: string;
}

export class GateValidationResponseDto {
  @ApiProperty({
    enum: GateValidationResult,
    example: GateValidationResult.VALID,
    description: 'Outcome of the gate ticket validation',
  })
  result!: GateValidationResult;

  @ApiProperty({
    type: GateTicketSummaryDto,
    required: false,
  })
  ticket?: GateTicketSummaryDto;

  @ApiProperty({
    type: GateEventSummaryDto,
    required: false,
  })
  event?: GateEventSummaryDto;
}
