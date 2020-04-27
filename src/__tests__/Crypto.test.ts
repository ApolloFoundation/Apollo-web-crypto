import * as fs from 'fs';
import { arrayBufferToString } from 'pvutils';
import Crypto from '../Crypto';
import converters from '../util/converters';

const TEST_DATA_DIR = './testdata/';
const PLAIN_FILE_TEXT = 'input/lorem_ipsum.txt';
const OUT_FILE_KEYSEED_S2N = 'keyseed_srtring2nonces_test.bin';
const OUT_FILE_KEYSEED_B2N = 'keyseed_bytes2nonces_test.bin';
const OUT_FILE_PUBKEY_B = 'pubkey_string_b_test.bin';
const OUT_FILE_PUBKEY_S = 'pubkey_string_test.bin';
const OUT_FILE_PRIVKEY_B = 'privkey_string_b_test.bin';
const OUT_FILE_PRIVKEY_S = 'privkey_string_s_test.bin';
const OUT_FILE_SIGN_B = 'sign_string_b_test.bin';
const OUT_FILE_SIGN_S = 'sign_string_s_test.bin';
const OUT_FILE_SHARED = 'shared_key_test.bin';
const OUT_FILE_SHARED_NONCE = 'shared_key_nonce_test.bin';
const OUT_FILE_AES = 'aes_encrypt_test.bin';
const OUT_FILE_AES_GCM = 'aes_gcm_encrypt_test.bin';
const secretPhraseA = 'Red fox jumps over the Lazy dog';
const secretPhraseB = 'Red dog jumps over the Lazy fox';
const nonce1: number[] = new Array(32); // (0-31)
const nonce2: number[] = new Array(32); // (32-63)

const writeToFile = (data: Uint8Array | string, fileName: string) => {
  if (typeof data !== 'string') data = arrayBufferToString(data);
  fs.writeFileSync(`${__dirname}/${TEST_DATA_DIR}/out/${fileName}`, data, { encoding: 'binary', flag: 'w' });
};

const readFromFile = (fileName: string, type: string = 'utf-8') =>
  fs.readFileSync(`${__dirname}/${TEST_DATA_DIR}${fileName}`, type);

const plainString: string = readFromFile(PLAIN_FILE_TEXT);

describe('Crypto Tests', () => {
  beforeAll(async () => {
    for (let i = 0; i < 32; i++) {
      nonce1[i] = i;
      nonce2[i] = i + 32;
    }
  });

  /**
   * Test of getMessageDigest method, of class Crypto.
   */
  test('GetMessageDigest', () => {
    const keySeed: number[] = Crypto.simpleHash(secretPhraseA, nonce1, nonce2);
    const result: string = converters.byteArrayToHexString(keySeed);
    const expResult = 'b1702f2262274290d1428b04f2e55e5af3af413575c7659ac02ee5633c504c6f';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_KEYSEED_B2N);
  });

  /**
   * Test of getKeySeed method, of class Crypto.
   */
  test('GetKeySeed String-byteArr', () => {
    const keySeed: number[] = Crypto.simpleHash(secretPhraseA, nonce1, nonce2);
    const result: string = converters.byteArrayToHexString(keySeed);
    const expResult = 'b1702f2262274290d1428b04f2e55e5af3af413575c7659ac02ee5633c504c6f';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_KEYSEED_B2N);
  });

  /**
   * Test of getKeySeed method, of class Crypto.
   */
  test('GetKeySeed byteArr-byteArr', () => {
    const secretPhraseBytes: number[] = converters.stringToHexStringToByteArray(secretPhraseA);
    const keySeed: number[] = Crypto.simpleHash(secretPhraseBytes, nonce1, nonce2);
    const result: string = converters.byteArrayToHexString(keySeed);
    const expResult = 'b1702f2262274290d1428b04f2e55e5af3af413575c7659ac02ee5633c504c6f';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_KEYSEED_B2N);
  });

  /**
   * Test of getPublicKey method, of class Crypto.
   */
  test('GetPublicKey byteArr', () => {
    const secretPhraseBytes: number[] = converters.stringToHexStringToByteArray(secretPhraseA);
    const keySeed: number[] = Crypto.simpleHash(secretPhraseBytes);
    const result: string = converters.byteArrayToHexString(keySeed);
    const expResult = 'b0f12497c84af1ac2603f97d1fb804fc308e241d522fa5d21e900facbb92d6ee';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_PUBKEY_B);
  });

  /**
   * Test of getPublicKey method, of class Crypto.
   */
  test('GetPublicKey String', () => {
    const publicKey: string = Crypto.getPublicKey(secretPhraseA);
    const expResult = '1b93c9dd30b8fb288463b3fd004c555ceb635c085642ef25d733275fcc33a47b';
    expect(publicKey).toEqual(expResult);
    writeToFile(publicKey, OUT_FILE_PUBKEY_S);
  });

  /**
   * Test of getPrivateKey method, of class Crypto.
   */
  test('GetPrivateKey byteArr', () => {
    const secretPhraseBytes: number[] = converters.stringToHexStringToByteArray(secretPhraseA);
    const result: string = Crypto.getPrivateKey(secretPhraseBytes);
    const expResult = 'b0f12497c84af1ac2603f97d1fb804fc308e241d522fa5d21e900facbb92d66e';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_PRIVKEY_B);
  });

  /**
   * Test of getPrivateKey method, of class Crypto.
   */
  test('GetPrivateKey String', () => {
    const result: string = Crypto.getPrivateKey(secretPhraseA);
    const expResult = 'b0f12497c84af1ac2603f97d1fb804fc308e241d522fa5d21e900facbb92d66e';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_PRIVKEY_S);
  });

  /**
   * Test of sign method, of class Crypto.
   */
  test('Sign byteArr-String', () => {
    // for unsignedTransactionBytes (already hex string) need converters.hexStringToByteArray
    const message: number[] = converters.stringToByteArray(plainString);
    const result: string = Crypto.signBytes(message, secretPhraseA);
    const expResult =
      'f565212c53a668006fbdb12c512e51f7add8118e6573d5c7261e9f58944e5c0b0ae76275210b795915a3017852fe8bca1a3cd2d2b02b32a51e0e03b18e6335f8';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_SIGN_S);
  });

  /**
   * Test of sign method, of class Crypto.
   */
  test('Sign byteArr-byteArr', () => {
    // for unsignedTransactionBytes (already hex string) need converters.hexStringToByteArray
    const message: number[] = converters.stringToByteArray(plainString);
    const secretPhraseBytes: number[] = converters.stringToHexStringToByteArray(secretPhraseA);
    const keySeed: number[] = Crypto.simpleHash(secretPhraseBytes);
    const result: string = Crypto.signBytes(message, keySeed);
    const expResult =
      'f565212c53a668006fbdb12c512e51f7add8118e6573d5c7261e9f58944e5c0b0ae76275210b795915a3017852fe8bca1a3cd2d2b02b32a51e0e03b18e6335f8';
    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_SIGN_B);
  });

  /**
   * Test of verify method, of class Crypto.
   */
  test('Verify sign', () => {
    // for unsignedTransactionBytes (already hex string) need converters.hexStringToByteArray
    const message: string = converters.stringToHexString(plainString);
    const signature: string =
      'f565212c53a668006fbdb12c512e51f7add8118e6573d5c7261e9f58944e5c0b0ae76275210b795915a3017852fe8bca1a3cd2d2b02b32a51e0e03b18e6335f8';
    const publicKey: string = Crypto.getPublicKey(secretPhraseA);
    const result = Crypto.verifySignature(signature, message, publicKey);
    expect(result).toBe(true);
  });

  /**
   * Test of getSharedKey method, of class Crypto.
   */
  test('GetSharedKey byteArr-byteArr', () => {
    const myPrivateKey: string = Crypto.getPrivateKey(secretPhraseA);
    const theirPublicKey: string = Crypto.getPublicKey(secretPhraseB);
    const sharedKeyBytes: number[] = Crypto.getSharedKey(myPrivateKey, theirPublicKey);
    const expResult: string = converters.byteArrayToHexString(sharedKeyBytes);

    const theirPrivateKey: string = Crypto.getPrivateKey(secretPhraseB);
    const myPublicKey: string = Crypto.getPublicKey(secretPhraseA);
    const resultBytes: number[] = Crypto.getSharedKey(theirPrivateKey, myPublicKey);
    const result: string = converters.byteArrayToHexString(resultBytes);

    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_SHARED);
  });

  /**
   * Test of getSharedKey method, of class Crypto.
   */
  test('GetSharedKey 3args', () => {
    const myPrivateKey: string = Crypto.getPrivateKey(secretPhraseA);
    const theirPublicKey: string = Crypto.getPublicKey(secretPhraseB);
    const sharedKeyBytes: number[] = Crypto.getSharedKey(myPrivateKey, theirPublicKey, nonce1);
    const expResult: string = converters.byteArrayToHexString(sharedKeyBytes);

    const theirPrivateKey: string = Crypto.getPrivateKey(secretPhraseB);
    const myPublicKey: string = Crypto.getPublicKey(secretPhraseA);
    const resultBytes: number[] = Crypto.getSharedKey(theirPrivateKey, myPublicKey, nonce1);
    const result: string = converters.byteArrayToHexString(resultBytes);

    expect(result).toEqual(expResult);
    writeToFile(result, OUT_FILE_SHARED_NONCE);
  });

  /**
   * Test of aesEncrypt method, of class Crypto.
   */
  // test('AesEncrypt', () => {
  // const myPrivateKey: string = Crypto.getPrivateKey(secretPhraseA);
  // const theirPublicKey: string = Crypto.getPublicKey(secretPhraseB);
  // const sharedKeyBytes: number[] = Crypto.getSharedKey(myPrivateKey, theirPublicKey);
  // const key: string = converters.byteArrayToHexString(sharedKeyBytes);
  // const expResult: number[] = converters.stringToByteArray(plainString);
  // const resultEnc: string = Crypto.aesEncrypt(plainString, key);
  // const result: object = Crypto.aesDecrypt(resultEnc, key);
  // expect(result).toEqual(expResult);
  // writeToFile(resultEnc, OUT_FILE_AES);
  // });

  /**
   * Test of aesGCMEncrypt method, of class Crypto.
   */
  // test('AesGCMEncrypt', () => {
  // const myPrivateKey: string = Crypto.getPrivateKey(secretPhraseA);
  // const theirPublicKey: string = Crypto.getPublicKey(secretPhraseB);
  // const sharedKeyBytes: number[] = Crypto.getSharedKey(myPrivateKey, theirPublicKey);
  // const key: string = converters.byteArrayToHexString(sharedKeyBytes);
  // const expResult: number[] = converters.stringToByteArray(plainString);
  // const resultEnc: string = Crypto.aesGCMEncrypt(plainString, key);
  // const result: object = Crypto.aesGCMDecrypt(resultEnc, key);
  // expect(result).toEqual(expResult);
  // writeToFile(resultEnc, OUT_FILE_AES_GCM);
  // });
});
