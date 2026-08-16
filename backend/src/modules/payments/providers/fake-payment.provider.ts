import { Injectable } from '@nestjs/common';

import { PaymentSimulation } from '../enums/payment-simulation.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentProvider, PaymentResult } from './payment-provider.interface';

@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  processPayment(
    _amount: string,
    simulation: PaymentSimulation,
  ): Promise<PaymentResult> {
    if (simulation === PaymentSimulation.DECLINE) {
      return Promise.resolve({
        success: false,
        status: PaymentStatus.DECLINED,
        provider: 'FAKE',
        errorMessage: 'Payment declined by simulator',
      });
    }

    return Promise.resolve({
      success: true,
      status: PaymentStatus.APPROVED,
      provider: 'FAKE',
    });
  }
}
