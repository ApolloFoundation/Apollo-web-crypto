import Transaction from '../Transaction';
import ElGamalEncryption from '../ElGamalEncryption';

describe('ElGamal Tests', () => {
  process.env.APL_SERVER = 'http://localhost:7876';

  test('Encryption', async () => {
    const secretPhrase = '0';
    const result = await ElGamalEncryption.process(secretPhrase);
    expect.stringContaining(result);
  });
});
