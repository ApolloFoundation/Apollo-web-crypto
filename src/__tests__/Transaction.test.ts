import Transaction from '../Transaction';
import converters from '../util/converters';
import { handleFetch, POST } from '../helpers/fetch';

const ONE_APL = 100000000;

describe('Transaction Tests', () => {
  process.env.APL_SERVER = 'https://apl-t3-1.testnet3.apollowallet.org';

  test('SMC publish with offline sign', async () => {
    const data = {
      name: 'MyAPL20PersonalLockable',
      sender: 'APL-NZKH-MZRE-2CTT-98NPZ',
      params: [],
      value: '0',
      fuelPrice: '100',
      fuelLimit: '500000000',
      source:
        "class MyAPL20PersonalLockable extends APL20PersonalLockable {\n      constructor(){\n          super('TEST1','TST','100000000000000','50000000000','100000000','3000000000','0x7fd6869feeca7e2f');\n      }\n    }",
      secretPhrase: '0',
    };
    const resultTx = await handleFetch(`/rest/v2/smc/publish`, POST, data, true);
    const originalSignedTransactionString = resultTx.tx;
    const unsignedTransactionString = originalSignedTransactionString.substring(
      0,
      originalSignedTransactionString.indexOf('4d53494700000000'),
    );
    const signedTransactionBytes = await Transaction.multiSigTxBytes(unsignedTransactionString, [data.secretPhrase]);
    const signedTransactionString = converters.byteArrayToHexString(signedTransactionBytes);
    expect(signedTransactionString).toEqual(originalSignedTransactionString);
  });

  test('SendMoney with doNotSign', async () => {
    const data = {
      requestType: 'sendMoney',
      recipient: 'APL-NZKH-MZRE-2CTT-98NPZ',
      amountATM: 2 * ONE_APL,
      feeATM: ONE_APL,
      secretPhrase: '0',
      sender: 3705364957971254799,
      deadline: 1440,
    };
    const result = await Transaction.sendNotSign(data);
    expect(result.unsignedTransactionBytes).not.toBeUndefined();
  });

  test('SendMoney with offline signing', async () => {
    expect.assertions(2);
    const data = {
      requestType: 'sendMoney',
      recipient: 'APL-NZKH-MZRE-2CTT-98NPZ',
      amountATM: 2 * ONE_APL,
      feeATM: ONE_APL,
      secretPhrase: '0',
      sender: 3705364957971254799,
      deadline: 1440,
    };
    const response = await Transaction.send(data);
    const { transactionBytes, signature } = Transaction.processOfflineSign(data, response);
    expect(transactionBytes).toEqual(response.transactionBytes);
    expect(signature).toEqual(response.transactionJSON.signature);
  });

  test('Send broadcastTransaction', async () => {
    const data = {
      requestType: 'sendMoney',
      recipient: 'APL-NZKH-MZRE-2CTT-98NPZ',
      amountATM: 3 * ONE_APL,
      feeATM: ONE_APL,
      secretPhrase: '0',
      sender: 3705364957971254799,
      deadline: 1440,
    };
    const response = await Transaction.sendWithOfflineSign(data);
    const dataTransaction = {
      requestType: 'broadcastTransaction',
      // transactionJSON: JSON.stringify(response.transactionJSON),
      transactionBytes: response.transactionBytes,
    };
    const responseTransaction = await Transaction.send(dataTransaction);
    expect(responseTransaction.transaction).not.toBeUndefined();
  });
});
