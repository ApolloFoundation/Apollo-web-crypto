import Transaction from '../Transaction';
import converters from '../util/converters';
import { bufferToHexCodes, stringToArrayBuffer } from 'pvutils';

describe('Transaction Tests', () => {
  process.env.APL_SERVER = 'http://localhost:7876';

  test('SendMoney with doNotSign', async () => {
    const data = {
      requestType: 'sendMoney',
      recipient: 'APL-NZKH-MZRE-2CTT-98NPZ',
      amountATM: 200000000,
      feeATM: 100000000,
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
      amountATM: 200000000,
      feeATM: 100000000,
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
      amountATM: 3000000000,
      feeATM: 100000000,
      secretPhrase: '0',
      sender: 3705364957971254799,
      deadline: 1440,
    };
    const response = await Transaction.sendWithOfflineSign(data);
    const dataTransaction = {
      requestType: 'broadcastTransaction',
      // transactionJSON: JSON.stringify(response.transactionJSON),
      transactionBytes: response.transactionBytes,
    }
    const responseTransaction = await Transaction.send(dataTransaction);
    expect(responseTransaction.transaction).not.toBeUndefined();
  });

  test('Create transactionBytes sendMoney', async () => {
    try {
      const data = {
        requestType: 'sendMoney',
        recipient: 'APL-NZKH-MZRE-2CTT-98NPZ',
        amountATM: "3000000000",
        feeATM: "100000000",
        secretPhrase: '0',
        sender: 3705364957971254799,
        deadline: 1440,
      };
      const resultTransactionBytes = await Transaction.generateTransactionBytes(data);
      // const {transactionBytes} = await Transaction.sendWithOfflineSign(data);
      // const resultTB = converters.hexStringToByteArray(resultTransactionBytes)
      // const resTB = converters.hexStringToByteArray(transactionBytes)
      const dataTransaction = {
        requestType: 'broadcastTransaction',
        transactionBytes: resultTransactionBytes,
      }
      const responseTransaction = await Transaction.send(dataTransaction);
      expect(responseTransaction.transaction).not.toBeUndefined();
    } catch (e) {
      console.log(e)
    }
  });
});
