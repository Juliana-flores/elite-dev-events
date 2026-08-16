import { PaymentSimulation } from '../enums/payment-simulation.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export interface PaymentResult {
  success: boolean;
  status: PaymentStatus;
  provider: string;
  errorMessage?: string;
}

export interface PaymentProvider {
  processPayment(
    amount: string,
    simulation: PaymentSimulation,
  ): Promise<PaymentResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
