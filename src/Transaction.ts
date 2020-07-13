import Crypto from './Crypto';
import ElGamalEncryption from './ElGamalEncryption';
import { GET, handleFetch, POST } from './helpers/fetch';
import converters from './util/converters';
import { ReedSolomonDecode } from './ReedSolomon';
import { TransactionType } from './constants/TransactionType';

export default class Transaction {
  public static async send(dataObj: any): Promise<any> {
    if (!dataObj.requestType) {
      throw new Error('Undefined request type');
    }
    const data = Object.assign({}, dataObj);
    if (data.secretPhrase) {
      data.publicKey = Crypto.getPublicKey(data.secretPhrase);
      if (data.doNotSign) {
        delete data.secretPhrase;
      } else {
        data.secretPhrase = await ElGamalEncryption.process(data.secretPhrase);
      }
    }
    return await handleFetch(`/apl?requestType=${dataObj.requestType}`, POST, data);
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
      transactionBytes,
      unsignedTransactionBytes: response.unsignedTransactionBytes,
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
        const signature: string = Crypto.signHash(unsignedTransactionBytes, data.secretPhrase);
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

  public static async generateTransactionBytes(data: any): Promise<any> {
    const bytesValue = (value: number, bytes: number = 8) => {
      const resBuff = Buffer.allocUnsafe(8);
      const amountBigInt = BigInt(value);
      resBuff.writeBigUInt64LE(amountBigInt, 0);
      return resBuff.slice(0, bytes);
    };
    const getType = (requestType: string, isAppendix: boolean = false): any => {
      const typeBuf = Buffer.allocUnsafe(1);
      const subtypeBuf = Buffer.allocUnsafe(1);
      const flagsBuf = Buffer.allocUnsafe(4);
      switch (requestType) {
        case 'sendMoney':
          typeBuf.writeUIntLE(TransactionType.TYPE_PAYMENT, 0, 1);
          subtypeBuf.writeUIntLE(0x10, 0, 1);
          if (isAppendix) {
            flagsBuf.writeUIntLE(0x01, 0, 4);
          } else {
            flagsBuf.writeUIntLE(0x0, 0, 4);
          }
          break;
        case 'childAccount':
          typeBuf.writeUIntLE(TransactionType.TYPE_CHILD_ACCOUNT, 0, 1);
          subtypeBuf.writeUIntLE(TransactionType.SUBTYPE_CHILD_CREATE, 0, 1);
          flagsBuf.writeUIntLE(0x0, 0, 4);
          break;
      }
      return {
        type: typeBuf,
        subtype: subtypeBuf,
        flags: flagsBuf,
      };
    };
    const getTimestamp = (value: number) => {
      const timestampBuf = Buffer.allocUnsafe(4);
      timestampBuf.writeUIntLE(value, 0, 4);
      return timestampBuf;
    };
    const getKey = (secretPhrase: string): Buffer => {
      const secretPhraseHex = Crypto.getPublicKey(secretPhrase);
      const secretPhraseBytes = converters.hexStringToByteArray(secretPhraseHex);
      return Buffer.from(secretPhraseBytes);
    };
    const getRecipient = (recipient: string) => {
      const recipientID: string = ReedSolomonDecode(recipient);
      const bigIntRes = BigInt((recipientID));
      const resBuff = Buffer.allocUnsafe(8);
      resBuff.writeBigUInt64LE(bigIntRes, 0);
      return resBuff;
    };
    const getBlockchain = async () => {
      return handleFetch(`/rest/v2/state/blockchain`, GET);
    };

    const blockchainResult = await getBlockchain();

    if (blockchainResult && !blockchainResult.errorCode) {
      const { type, subtype, flags } = getType(data.requestType);
      const timestamp = getTimestamp(blockchainResult.txTimestamp);
      const deadline = bytesValue(data.deadline, 2);
      const senderPublicKey = getKey(data.secretPhrase);
      const recipientId = getRecipient(data.recipient);
      const amountATM = bytesValue(data.amountATM);
      const feeATM = bytesValue(data.feeATM);
      const referencedTransactionFullHash = new Uint8Array(32);
      let signature = Buffer.allocUnsafe(64);
      const ecBlockHeight = bytesValue(blockchainResult.ecBlockHeight, 4);
      const ecBlockId = bytesValue(blockchainResult.ecBlockId);

      const unsignedTransactionBytes = Buffer.allocUnsafe(176);
      let offset = 0;
      unsignedTransactionBytes.set(type, offset);
      offset += type.length;
      unsignedTransactionBytes.set(subtype, offset);
      offset += subtype.length;
      unsignedTransactionBytes.set(timestamp, offset);
      offset += timestamp.length;
      unsignedTransactionBytes.set(deadline, offset);
      offset += deadline.length;
      unsignedTransactionBytes.set(senderPublicKey, offset);
      offset += senderPublicKey.length;
      unsignedTransactionBytes.set(recipientId, offset);
      offset += recipientId.length;
      unsignedTransactionBytes.set(amountATM, offset);
      offset += amountATM.length;
      unsignedTransactionBytes.set(feeATM, offset);
      offset += feeATM.length;
      unsignedTransactionBytes.set(referencedTransactionFullHash, offset);
      offset += referencedTransactionFullHash.length;
      unsignedTransactionBytes.set(signature, offset);
      offset += signature.length;
      unsignedTransactionBytes.set(flags, offset);
      offset += flags.length;
      unsignedTransactionBytes.set(ecBlockHeight, offset);
      offset += ecBlockHeight.length;
      unsignedTransactionBytes.set(ecBlockId, offset);
      offset += ecBlockId.length;

      const signatureUint8Arr = Crypto.signBytes(unsignedTransactionBytes, data.secretPhrase);
      signature = Buffer.from(signatureUint8Arr);
      unsignedTransactionBytes.set(signature, 96);
      return converters.byteArrayToHexString(unsignedTransactionBytes);
    } else {
      throw new Error(blockchainResult.errorDescription);
    }
  }
}
