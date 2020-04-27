import Crypto from './Crypto';
import ElGamalEncryption from './ElGamalEncryption';
import { handleFetch, POST } from './helpers/fetch';
import converters from './util/converters';

export default class Transaction {
  public static async send(dataObj: any): Promise<any> {
    if (!dataObj.requestType) {
      throw new Error('Undefined request type');
    }
    if (!dataObj.secretPhrase) {
      throw new Error('Passphrase required field');
    }
    dataObj.publicKey = Crypto.getPublicKey(dataObj.secretPhrase);
    const data = Object.assign({}, dataObj);
    if (data.doNotSign) {
      delete data.secretPhrase;
    } else {
      data.secretPhrase = await ElGamalEncryption.process(data.secretPhrase);
    }
    return handleFetch(`/apl?requestType=${dataObj.requestType}`, POST, data);
  }

  public static sendNotSign(dataObj: any): any {
    const data = {
      ...dataObj,
      doNotSign: 1,
      broadcast: false,
    };
    return this.send(data);
  }

  public static async sendWithOfflineSign(data: any): Promise<any> {
    const response = await Transaction.sendNotSign(data);
    const { transactionBytes, signature } = this.processOfflineSign(data, response);
    return {
      ...response,
      transactionBytes,
      transactionJSON: {
        ...response.transactionJSON,
        signature,
      },
    };
  }

  public static processOfflineSign(data: any, response: any): any {
    if (response && !response.errorCode) {
      if (response.unsignedTransactionBytes) {
        const unsignedTransactionBytes: number[] = converters.hexStringToByteArray(response.unsignedTransactionBytes);
        const signature: string = Crypto.signBytes(unsignedTransactionBytes, data.secretPhrase);
        const publicKey = Crypto.getPublicKey(data.secretPhrase);
        if (!Crypto.verifySignature(signature, response.unsignedTransactionBytes, publicKey)) {
          return;
        }
        const transactionBytes =
          response.unsignedTransactionBytes.substr(0, 192) + signature + response.unsignedTransactionBytes.substr(320);
        return {
          transactionBytes,
          signature,
        };
      }
    }
    return;
  }
}
