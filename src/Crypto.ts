import * as CryptoJS from 'crypto-js';
import curve25519 from './helpers/curve25519';
import curve25519_ from './helpers/curve25519_';
import converters from './util/converters';
const NodeCrypto = require('node-webcrypto-ossl');
const crypto = new NodeCrypto.Crypto();

export default class Crypto {
  public static signBytes(messageBytes: number[], secretPhrase: string | number[]): string {
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
      return converters.byteArrayToHexString(v.concat(h));
    } else {
      throw new Error('Signing error');
    }
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

  public static simpleHash(b1: string | number[], ...nonces): number[] {
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
    const sharedSecret: number[] = this.getSharedSecret(privateKey, publicKey);
    return this.sharedSecretToSharedKey(sharedSecret, nonce);
  }

  public static sharedSecretToSharedKey(sharedSecret: number[], nonce?: number[]): number[] {
    if (nonce) {
      for (let i = 0; i < 32; i++) {
        sharedSecret[i] ^= nonce[i];
      }
    }
    return this.simpleHash(sharedSecret);
  }

  public static aesEncrypt(plaintext: string, sharedKey: string) {
    return this.aesEncryptImpl(converters.stringToByteArray(plaintext), {
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

  private static getSharedSecret(key1: string, key2: string): number[] {
    return converters.shortArrayToByteArray(
      curve25519_(converters.byteArrayToShortArray(key1), converters.byteArrayToShortArray(key2), null),
    );
  }

  private static aesEncryptImpl(payload: number[], options: any) {
    const ivBytes = crypto.randomBytes(16);

    // CryptoJS likes WordArray parameters
    const wordArrayPayload: any = converters.byteArrayToWordArray(payload);
    let sharedKey;
    if (!options.sharedKey) {
      sharedKey = this.getSharedSecret(options.privateKey, options.publicKey);
    } else {
      sharedKey = options.sharedKey.slice(0); //clone
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
}
