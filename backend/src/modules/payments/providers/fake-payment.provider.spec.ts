import { PaymentSimulation } from '../enums/payment-simulation.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { FakePaymentProvider } from './fake-payment.provider';

describe('FakePaymentProvider', () => {
  let provider: FakePaymentProvider;

  beforeEach(() => {
    provider = new FakePaymentProvider();
  });

  it('should approve payment when simulation is APPROVE', async () => {
    const result = await provider.processPayment(
      '100.00',
      PaymentSimulation.APPROVE,
    );
    expect(result).toEqual({
      success: true,
      status: PaymentStatus.APPROVED,
      provider: 'FAKE',
    });
  });

  it('should decline payment when simulation is DECLINE', async () => {
    const result = await provider.processPayment(
      '100.00',
      PaymentSimulation.DECLINE,
    );
    expect(result).toEqual({
      success: false,
      status: PaymentStatus.DECLINED,
      provider: 'FAKE',
      errorMessage: 'Payment declined by simulator',
    });
  });
});
