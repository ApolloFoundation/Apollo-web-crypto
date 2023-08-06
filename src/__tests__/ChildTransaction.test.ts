import { Crypto, Transaction } from '../index';
import { TransactionData, UniversalTransactionData } from '../Transaction';
import { handleFetch, GET, POST } from '../helpers/fetch';

const ONE_APL = 100000000;

describe('Child Transactions Tests', () => {
  process.env.APL_SERVER = 'https://apl-tap-0.testnet-ap.apollowallet.org';
  // process.env.APL_SERVER = 'http://localhost:7876/rest';

  test('Create transactionBytes for send money', async () => {
    const blockchainResult = await handleFetch(`/rest/v2/state/blockchain`, GET, null, true);
    const data: UniversalTransactionData = {
      parent: 'APL-632K-TWX3-2ALQ-973CU',
      parentSecret: '101',
      // sender: 'APL-8QBE-DAN8-ZYF4-HE3GZ', // child 1
      senderSecret: '1011',
      recipient: 'APL-DGFX-8ZYH-M5B8-C3XDT', // child 2
      amount: 3 * ONE_APL,
      attachment: JSON.stringify({ text: 'Text in attachment' }),
      txTimestamp: blockchainResult.txTimestamp,
      ecBlockHeight: blockchainResult.ecBlockHeight,
      ecBlockId: blockchainResult.ecBlockId,
    };
    const resultTransactionBytes = await Transaction.sendMoneyTransactionBytes(data);
    const responseTransaction = await handleFetch(`/rest/v2/transaction`, POST, { tx: resultTransactionBytes }, true);
    console.log('---responseTransaction---', responseTransaction);
    expect(responseTransaction.transaction).not.toBeUndefined();
  });

  test('Create transactionBytes for create the child account ', async () => {
    try {
      const blockchainResult = await handleFetch(`/rest/v2/state/blockchain`, GET, null, true);
      const aplPassphrase = Crypto.generatePassPhrase();
      const publicKey: string = Crypto.getPublicKey(aplPassphrase);
      const accountRs: string = Crypto.getAccountIdFromPublicKey(publicKey, true);
      console.log('Account publicKey:', publicKey);
      console.log('Account RS:', accountRs);
      console.log('Account passphrase:', aplPassphrase);
      const data = {
        parent: 'APL-632K-TWX3-2ALQ-973CU',
        parentSecret: '101',
        publicKeys: [publicKey], // new child
        txTimestamp: blockchainResult.txTimestamp,
        ecBlockHeight: blockchainResult.ecBlockHeight,
        ecBlockId: blockchainResult.ecBlockId,
      };
      const resultTransactionBytes = await Transaction.childAccountTransactionBytes(data);
      const responseTransaction = await handleFetch(`/rest/v2/transaction`, POST, { tx: resultTransactionBytes }, true);
      console.log('---responseTransaction---', responseTransaction);
      expect(responseTransaction.transaction).not.toBeUndefined();
    } catch (e) {
      console.log(e);
    }
  });
});
