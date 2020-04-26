import Crypto from './Crypto';
import { handleFetch, POST } from './helpers/fetch';
import converters from './util/converters';

export default class Transaction {
  public static send(dataObj: any): any {
    if (!dataObj.requestType) {
      throw new Error('Undefined request type');
    }
    if (!dataObj.secretPhrase) {
      throw new Error('Passphrase required field');
    }
    dataObj.publicKey = Crypto.getPublicKey(dataObj.secretPhrase);
    if (dataObj.doNotSign) {
      delete dataObj.secretPhrase;
    }
    return handleFetch(`/apl?requestType=${dataObj.requestType}`, POST, dataObj);
  }

  public static sendNotSign(dataObj: any): any {
    const data = {
      ...dataObj,
      doNotSign: 1,
      broadcast: false,
    };
    return this.send(data);
  }

  public static async sendWithOfflineSign(dataObj: any): Promise<any> {
    const response = await Transaction.sendNotSign(dataObj);
    if (response && !response.errorCode) {
      if (response.unsignedTransactionBytes) {
        const unsignedTransactionBytes: number[] = converters.hexStringToByteArray(response.unsignedTransactionBytes);
        const signature: string = Crypto.signBytes(unsignedTransactionBytes, dataObj.secretPhrase);
        const publicKey = Crypto.getPublicKey(dataObj.secretPhrase);
        if (!Crypto.verifySignature(signature, response.unsignedTransactionBytes, publicKey)) {
          return;
        }
        response.transactionBytes =
          response.unsignedTransactionBytes.substr(0, 192) + signature + response.unsignedTransactionBytes.substr(320);
        response.transactionJSON.signature = signature;
      }
    }
    return response;
  }
}
