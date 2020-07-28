import Transaction from '../Transaction';
import Crypto from '../Crypto';
import { TxApi } from '../apollo-api-v2/api/txApi';

const ONE_APL = 100000000;

describe('Child Transactions Tests', () => {
  process.env.APL_SERVER = 'https://apl-tap-0.testnet-ap.apollowallet.org/rest';
  // process.env.APL_SERVER = 'http://localhost:7876/rest';

  test('Create transactionBytes for send money', async () => {
    const data = {
      requestType: 'sendMoney',
      parent: 'APL-632K-TWX3-2ALQ-973CU',
      parentSecret: '101',
      sender: 'APL-8QBE-DAN8-ZYF4-HE3GZ', // child 1
      senderSecret: '1011',
      recipient: 'APL-DGFX-8ZYH-M5B8-C3XDT', // child 2
      amount: 3 * ONE_APL,
      attachment: JSON.stringify({ text: 'Text in attachment' }),
    };
    const resultTransactionBytes = await Transaction.generateTransactionBytes(data);
    const txApi = new TxApi();
    txApi.basePath = process.env.APL_SERVER || 'http://localhost:7876/rest';
    const responseTransaction = await txApi.broadcastTx({ tx: resultTransactionBytes });
    console.log('---responseTransaction---', responseTransaction);
    expect(responseTransaction.body.transaction).not.toBeUndefined();
  });

  test('Create transactionBytes for create the child account ', async () => {
    const aplPassphrase =
      'subsists coopers wheeling audios seven hoods paged geegaws layer lips jodhpurs soften rearming tackiest';
    const publicKey: string = Crypto.getPublicKey(aplPassphrase);
    const accountRs: string = Crypto.getAccountIdFromPublicKey(publicKey, true);
    console.log('Account publicKey:', publicKey);
    console.log('Account RS:', accountRs);
    console.log('Account passphrase:', aplPassphrase);
    const data = {
      requestType: 'childAccount',
      parent: 'APL-632K-TWX3-2ALQ-973CU',
      parentSecret: '101',
      publicKeys: [publicKey], // new child
    };
    const resultTransactionBytes = await Transaction.generateTransactionBytes(data);
    const txApi = new TxApi();
    txApi.basePath = process.env.APL_SERVER || 'http://localhost:7876/rest';
    const responseTransaction = await txApi.broadcastTx({ tx: resultTransactionBytes });
    console.log('---responseTransaction---', responseTransaction);
    expect(responseTransaction.body.transaction).not.toBeUndefined();
  });
});
