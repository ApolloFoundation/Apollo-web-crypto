import Transaction from '../Transaction';

describe('Transaction Tests', () => {
  process.env.APL_SERVER = 'http://localhost:7876';

  test('SendMoney with doNotSign', async () => {
    const data = {
      requestType: 'sendMoney',
      recipient: 'APL-NZKH-MZRE-2CTT-98NPZ',
      amountATM: 200000000,
      feeATM: 100000000,
      isCustomFee: false,
      secretPhrase: '0',
      sender: 3705364957971254799,
      deadline: 1440,
    };
    const result = await Transaction.sendNotSign(data);
    expect.stringContaining(result.unsignedTransactionBytes);
  });

  test('SendMoney with offline signing', async () => {
    const data = {
      requestType: 'sendMoney',
      recipient: 'APL-NZKH-MZRE-2CTT-98NPZ',
      amountATM: 200000000,
      feeATM: 100000000,
      isCustomFee: false,
      secretPhrase: '0',
      sender: 3705364957971254799,
      deadline: 1440,
    };
    const result = await Transaction.sendWithOfflineSign(data);
    const resultExp = await Transaction.send(data);
    expect(result.transactionJSON.signature).toEqual(resultExp.transactionJSON.signature);
  });
});
