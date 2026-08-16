import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

import { PaymentSimulation } from '../enums/payment-simulation.enum';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'Simulation outcome scenario for the payment',
    enum: PaymentSimulation,
    example: PaymentSimulation.APPROVE,
  })
  @IsNotEmpty({ message: 'simulation is required' })
  @IsEnum(PaymentSimulation, {
    message: 'simulation must be either APPROVE or DECLINE',
  })
  simulation!: PaymentSimulation;
}
