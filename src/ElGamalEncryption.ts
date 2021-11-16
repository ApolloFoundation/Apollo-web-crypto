/******************************************************************************
 * Copyright © 2018 Apollo Foundation                                         *
 *                                                                            *
 ******************************************************************************/

import { BigInteger } from 'jsbn';
import * as crypto from 'crypto'; // TODO remove
import { sha256 } from 'js-sha256'; // TODO remove
import { SecureRandom } from './util/vendors/rng';
import { getSECCurveByName } from './util/vendors/sec';
import { ECAsymCrypto } from './util/vendors/ec_crypto';
import { ECPointFp } from './util/vendors/ec';
import converters from './util/converters';
import { handleFetch, POST } from './helpers/fetch';

export default class ElGamalEncryption {
  public static async process(secretPhrase: string) {
    const KEY = Buffer.from(crypto.randomBytes(32));
    const aesCipher = this.aes256gcm(KEY);
    const [encrypted, iv, authTag] = aesCipher.encrypt(secretPhrase);

    const c = getSECCurveByName('secp521r1');
    const { ElGamalX, ElGamalY } = await handleFetch(`/apl?requestType=getElGamalPublicKey`, POST);

    // @ts-ignore
    const EcCryptoCtx = new ECAsymCrypto(c, new SecureRandom());

    const bx = new BigInteger(ElGamalX, 16);
    const by = new BigInteger(ElGamalY, 16);

    const cv = c.getCurve();
    // @ts-ignore
    const _publicKey = new ECPointFp(cv, cv.fromBigInteger(bx), cv.fromBigInteger(by));
    EcCryptoCtx.SetPublic(_publicKey);

    EcCryptoCtx.SetPlainText(new BigInteger(converters.byteArrayToHexString(KEY), 16));
    EcCryptoCtx.Encrypt();

    const m1 = EcCryptoCtx.GetCipherTextM1();
    let m2 = EcCryptoCtx.GetCipherTextM2();

    let m1X = m1.getX().toBigInteger().toString(16);
    let m1Y = m1.getY().toBigInteger().toString(16);

    m1X = this.getZeros(m1X) + m1X;
    m1Y = this.getZeros(m1Y) + m1Y;

    m2 = m2.toString(16);
    m2 = this.getZeros(m2) + m2;

    const ElGamalCryptogram = m1X + m1Y + m2;
    const ivEncryptedAuthTag =
      converters.byteArrayToHexString(iv) + encrypted + converters.byteArrayToHexString(authTag);
    const shaKey = sha256(secretPhrase + KEY);

    return ivEncryptedAuthTag + ElGamalCryptogram + shaKey;
  }

  private static aes256gcm(key: Buffer) {
    const ALGO = 'aes-256-gcm';

    const encrypt = (str: string) => {
      const iv = Buffer.from(crypto.randomBytes(16));
      const cipher = crypto.createCipheriv(ALGO, key, iv);

      let enc = cipher.update(str, 'utf8', 'hex');
      enc += cipher.final('hex');

      return [enc, iv, cipher.getAuthTag()];
    };

    return { encrypt };
  }

  private static getZeros(value: string) {
    return !!(131 - value.length)
      ? new Array(131 - value.length).fill('0').reduce((a, b) => {
          return a + b;
        })
      : '';
  }
}
