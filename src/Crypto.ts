import * as CryptoJS from 'crypto-js';
import { WordArray } from 'crypto-js';

const pako = require('pako');
const crypto = require('crypto');
import curve25519 from './helpers/curve25519';
import curve25519_ from './helpers/curve25519_';
import converters from './util/converters';
import { words } from './constants/random-words';
import { ReedSolomonEncode } from './ReedSolomon';

export default class Crypto {
  public static signBytes(messageBytes: number[] | Uint8Array, secretPhrase: string | number[]) {
    if (!secretPhrase) {
      throw new Error('Signing passphrase required');
    }
    if (typeof secretPhrase === 'string') {
      const secretPhraseBytes: number[] = converters.stringToHexStringToByteArray(secretPhrase);
      secretPhrase = this.simpleHash(secretPhraseBytes);
    }
    const s = curve25519.keygen(secretPhrase).s;
    const m: number[] = this.simpleHash(messageBytes);
    const x: number[] = this.simpleHash(m, s);
    const y: number[] = curve25519.keygen(x).p;
    const h: number[] = this.simpleHash(m, y);
    const v: number[] | undefined = curve25519.sign(h, x, s);
    if (v) {
      return new Uint8Array(v.concat(h));
    } else {
      throw new Error('Signing error');
    }
  }

  public static signHash(messageBytes: number[] | Uint8Array, secretPhrase: string | number[]) {
    const signBytes = this.signBytes(messageBytes, secretPhrase);
    return converters.byteArrayToHexString(signBytes);
  }

  public static verifySignature(signature: string, message: string, publicKey: string): boolean {
    const signatureBytes: number[] = converters.hexStringToByteArray(signature);
    const messageBytes: number[] = converters.hexStringToByteArray(message);
    const publicKeyBytes: number[] = converters.hexStringToByteArray(publicKey);
    const v: number[] = signatureBytes.slice(0, 32);
    const h: number[] = signatureBytes.slice(32);
    const y: number[] = curve25519.verify(v, h, publicKeyBytes);
    const m: number[] = this.simpleHash(messageBytes);
    const h2: number[] = this.simpleHash(m, y);
    return this.areByteArraysEqual(h, h2);
  }

  public static simpleHash(b1: string | number[] | Uint8Array, ...nonces: any[]): number[] {
    if (typeof b1 === 'string') {
      b1 = converters.stringToByteArray(b1);
    }
    const sha256 = CryptoJS.algo.SHA256.create();
    sha256.update(converters.byteArrayToWordArray(b1));
    nonces.map((nonce) => {
      sha256.update(converters.byteArrayToWordArray(nonce));
    });
    const hash = sha256.finalize();
    return converters.wordArrayToByteArrayImpl(hash, false);
  }

  public static getPublicKey(secretPhrase: string | number[]): string {
    if (typeof secretPhrase === 'string') {
      secretPhrase = converters.stringToHexStringToByteArray(secretPhrase);
    }
    const digest: number[] = this.simpleHash(secretPhrase);
    return converters.byteArrayToHexString(curve25519.keygen(digest).p);
  }

  public static getPrivateKey(secretPhrase: string | number[]): string {
    if (typeof secretPhrase === 'string') {
      secretPhrase = converters.stringToHexStringToByteArray(secretPhrase);
    }
    const bytes: number[] = this.simpleHash(secretPhrase);
    return converters.shortArrayToHexString(this.curve25519_clamp(converters.byteArrayToShortArray(bytes)));
  }

  public static getSharedKey(privateKey: string, publicKey: string, nonce?: number[]): number[] {
    const privateKeyBytes = converters.hexStringToByteArray(privateKey);
    const publicKeyBytes = converters.hexStringToByteArray(publicKey);
    const sharedSecret: number[] = this.getSharedSecret(privateKeyBytes, publicKeyBytes);
    return this.sharedSecretToSharedKey(sharedSecret, nonce);
  }

  public static getAccountIdFromPublicKey(publicKey: string, isRsFt: boolean): string {
    const hex = converters.hexStringToByteArray(publicKey);
    let account: any = this.simpleHash(hex);
    account = converters.byteArrayToHexString(account);
    const slice = (converters.hexStringToByteArray(account)).slice(0, 8);
    const accountId = converters.byteArrayToBigInteger(slice).toString();
    if (isRsFt) {
      return ReedSolomonEncode(accountId);
    } else {
      return accountId;
    }
  }

  public static sharedSecretToSharedKey(sharedSecret: number[], nonce?: number[]): number[] {
    if (nonce) {
      for (let i = 0; i < 32; i++) {
        sharedSecret[i] ^= nonce[i];
      }
    }
    return this.simpleHash(sharedSecret);
  }

  public static aesEncrypt(plaintext: string, sharedKey: string): number[] {
    return this.aesEncryptImpl(converters.stringToByteArray(plaintext), {
      sharedKey: converters.stringToByteArray(sharedKey),
    });
  }

  public static aesDecrypt(data: string, sharedKey: string): object {
    return this.decryptData(converters.hexStringToByteArray(data), {
      sharedKey: converters.stringToByteArray(sharedKey),
    });
  }

  private static areByteArraysEqual(bytes1: number[], bytes2: number[]): boolean {
    if (bytes1.length !== bytes2.length) {
      return false;
    }
    for (let i = 0; i < bytes1.length; ++i) {
      if (bytes1[i] !== bytes2[i]) {
        return false;
      }
    }
    return true;
  }

  private static curve25519_clamp(curve: number[]): number[] {
    curve[0] &= 0xfff8;
    curve[15] &= 0x7fff;
    curve[15] |= 0x4000;
    return curve;
  }

  private static getSharedSecret(key1: number[], key2: number[]): number[] {
    return converters.shortArrayToByteArray(
      curve25519_(converters.byteArrayToShortArray(key1), converters.byteArrayToShortArray(key2), null),
    );
  }

  private static aesEncryptImpl(payload: number[], options: any): number[] {
    const ivBytes = new Uint32Array(16);
    crypto.randomFillSync(ivBytes);

    // CryptoJS likes WordArray parameters
    const wordArrayPayload: any = converters.byteArrayToWordArray(payload);
    let sharedKey;
    if (!options.sharedKey) {
      sharedKey = this.getSharedSecret(options.privateKey, options.publicKey);
    } else {
      sharedKey = options.sharedKey.slice(0); // clone
    }
    if (options.nonce !== undefined) {
      for (let i = 0; i < 32; i++) {
        sharedKey[i] ^= options.nonce[i];
      }
    }
    const sharedKeyFormated: any = converters.byteArrayToWordArray(sharedKey);
    const key = CryptoJS.SHA256(sharedKeyFormated);
    const ivFormated: any = converters.byteArrayToWordArray(ivBytes);
    const encrypted = CryptoJS.AES.encrypt(wordArrayPayload, key, { iv: ivFormated });
    const ivOut = converters.wordArrayToByteArray(encrypted.iv);
    const ciphertextOut = converters.wordArrayToByteArray(encrypted.ciphertext);
    return ivOut.concat(ciphertextOut);
  }

  private static decryptData(data: number[], options: any): object {
    if (!options.sharedKey) {
      options.sharedKey = this.getSharedSecret(options.privateKey, options.publicKey);
    }

    const result: any = this.aesDecryptImpl(data, options);
    let binData = new Uint8Array(result.decrypted);
    if (!(options.isCompressed === false)) {
      binData = pako.inflate(binData);
    }
    let message;
    if (!(options.isText === false)) {
      message = converters.byteArrayToString(binData);
    } else {
      message = converters.byteArrayToHexString(binData);
    }
    return { message, sharedKey: converters.byteArrayToHexString(result.sharedKey) };
  }

  private static aesDecryptImpl(ivCiphertext: number[], options: any) {
    if (ivCiphertext.length < 16 || ivCiphertext.length % 16 !== 0) {
      throw {
        name: 'invalid ciphertext',
      };
    }

    const iv: any = converters.byteArrayToWordArray(ivCiphertext.slice(0, 16));
    const ciphertext = converters.byteArrayToWordArray(ivCiphertext.slice(16));

    // shared key is use for two different purposes here
    // (1) if nonce exists, shared key represents the shared secret between the private and public keys
    // (2) if nonce does not exists, shared key is the specific key needed for decryption already xored
    // with the nonce and hashed
    let sharedKey;
    if (!options.sharedKey) {
      sharedKey = this.getSharedSecret(options.privateKey, options.publicKey);
    } else {
      sharedKey = options.sharedKey.slice(0); // clone
    }

    let key: WordArray;
    if (options.nonce) {
      for (let i = 0; i < 32; i++) {
        sharedKey[i] ^= options.nonce[i];
      }
      const sharedKeyFormatted: any = converters.byteArrayToWordArray(sharedKey);
      key = CryptoJS.SHA256(sharedKeyFormatted);
    } else {
      key = converters.byteArrayToWordArray(sharedKey);
    }

    // @ts-ignore
    const encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext,
      iv,
      key,
    });

    const decrypted = CryptoJS.AES.decrypt(encrypted, key, { iv });

    return {
      decrypted: converters.wordArrayToByteArray(decrypted),
      sharedKey: converters.wordArrayToByteArray(key),
    };
  }

  private static generatePassPhrase() {
    const bs = 128;
    const randomBts = new Uint32Array(bs / 32);
    crypto.randomFillSync(randomBts);
    const n = words.length;
    const phraseWords = [];
    let x, w1, w2, w3;
    let i;
    for (i = 0; i < randomBts.length; i++) {
      x = randomBts[i];
      w1 = x % n;
      w2 = (((x / n) >> 0) + w1) % n;
      w3 = (((((x / n) >> 0) / n) >> 0) + w2) % n;

      phraseWords.push(words[w1]);
      phraseWords.push(words[w2]);
      phraseWords.push(words[w3]);
    }

    return phraseWords.join(' ');
  }
}
