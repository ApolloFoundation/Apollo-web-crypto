import ElGamalEncryption from '../ElGamalEncryption';

describe('ElGamal Tests', () => {
  process.env.APL_SERVER = 'https://apl-t3-1.testnet3.apollowallet.org';

  test('Encryption', async () => {
    const secretPhrase = '0';
    const result = await ElGamalEncryption.process(secretPhrase);
    expect.stringContaining(result);
  });
});
