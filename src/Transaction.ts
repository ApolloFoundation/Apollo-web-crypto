import { Buffer } from 'buffer/index.js';
import Crypto from './Crypto';
import ElGamalEncryption from './ElGamalEncryption';
import { handleFetch, POST } from './helpers/fetch';
import converters from './util/converters';
import { ReedSolomonDecode, ReedSolomonEncode } from './ReedSolomon';
import { TransactionType } from './constants/TransactionType';

export interface TransactionData {
  recipient: string;
  amount: number;
  txTimestamp: number;
  ecBlockHeight: number | string;
  ecBlockId: string;
  fee?: number;
  parent?: string;
  parentSecret?: string;
  sender?: string;
  senderSecret?: string;
  attachment?: string;
  deadline?: number;
}

export interface UniversalTransactionData {
  recipient: string;
  txTimestamp?: number;
  ecBlockHeight?: number | string;
  ecBlockId?: string;
  amount?: number;
  feeATM?: number;
  parent?: string;
  parentSecret?: string;
  sender?: number;
  senderSecret?: string;
  passphrase?: string;
  attachment?: string;
  deadline?: number;
  requestType?: string;
  currency?: string;
  units?: number;
}

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

  public static processOfflineSignBytes = (unsignedTransactionBytes: Buffer, data: any): any => {
    if (unsignedTransactionBytes) {
      const unsignedTransactionString: string = converters.byteArrayToHexString(unsignedTransactionBytes);
      const signature: string = Crypto.signHash(unsignedTransactionBytes, data.secretPhrase);
      const publicKey = Crypto.getPublicKey(data.secretPhrase);
      if (!Crypto.verifySignature(signature, unsignedTransactionString, publicKey)) {
        return;
      }
      const transactionBytes =
        unsignedTransactionString.substr(0, 192) + signature + unsignedTransactionString.substr(320);
      return {
        transactionBytes,
        signature,
      };
    }
    return;
  };

  private static bytesValue = (value: number | string | undefined = 0, bytes: number = 8) => {
    const resBuff = Buffer.alloc(8);
    const valueBigInt = BigInt(value);
    // @ts-ignore
    resBuff.writeBigUInt64LE(valueBigInt, 0);
    return resBuff.slice(0, bytes);
  };

  private static getTimestamp = (value: number = 0) => {
    const timestampBuf = Buffer.alloc(4);
    timestampBuf.writeUIntLE(value, 0, 4);
    return timestampBuf;
  };

  private static getKey = (secretPhrase: string): Buffer => {
    const secretPhraseHex = Crypto.getPublicKey(secretPhrase);
    const secretPhraseBytes = converters.hexStringToByteArray(secretPhraseHex);
    return Buffer.from(secretPhraseBytes);
  };

  private static getRecipient = (recipient: string) => {
    const resBuff = Buffer.alloc(8);
    if (recipient && recipient.length > 0) {
      const recipientID: string = ReedSolomonDecode(recipient);
      const bigIntRes = BigInt(recipientID);
      // @ts-ignore
      resBuff.writeBigUInt64LE(bigIntRes, 0);
    }
    return resBuff;
  };

  private static checkMultiSig = (parentSecret?: string, senderSecret?: string): boolean => {
    return !!(parentSecret && senderSecret && parentSecret !== senderSecret);
  };

  public static multiSigTxBytes = (unsignedTransaction: Buffer | string, signers: string[]): Buffer => {
    let unsignedTransactionBytes;
    if (typeof unsignedTransaction === 'string') {
      unsignedTransactionBytes = Buffer.from(converters.hexStringToByteArray(unsignedTransaction));
    } else {
      unsignedTransactionBytes = unsignedTransaction;
    }
    const magic = Buffer.from('MSIG');
    const reserved = Buffer.alloc(4);
    const participantNumber = Buffer.alloc(2);
    const signersLength = signers.length;
    participantNumber.writeUInt8(signersLength, 0);
    let signatureBytes = Buffer.concat([magic, reserved, participantNumber]);
    for (let i = 0; i < signersLength; i++) {
      const signer = signers[i];
      const senderPublicKey = Transaction.getKey(signer);
      const keyId = senderPublicKey.slice(0, 8);
      const signature = Crypto.signBytes(unsignedTransactionBytes, signer);
      signatureBytes = Buffer.concat([signatureBytes, keyId, signature]);
    }
    return Buffer.concat([unsignedTransactionBytes, signatureBytes]);
  };

  public static multiSigTx = (resultObj: any, signers: string[]): Buffer => {
    const unsignedTransactionBytes = Buffer.concat([
      resultObj.type,
      resultObj.subtype,
      resultObj.timestamp,
      resultObj.deadline,
      resultObj.senderPublicKey,
      resultObj.recipientId,
      resultObj.amount,
      resultObj.fee,
      resultObj.referencedTransactionFullHash,
      resultObj.flags,
      resultObj.ecBlockHeight,
      resultObj.ecBlockId,
      resultObj.appendix,
    ]);
    return Transaction.multiSigTxBytes(unsignedTransactionBytes, signers);
  };

  public static oneSigTxBytes = (unsignedTransaction: Buffer | string, signer: string): Buffer => {
    let unsignedTransactionBytes;
    if (typeof unsignedTransaction === 'string') {
      unsignedTransactionBytes = Buffer.from(converters.hexStringToByteArray(unsignedTransaction));
    } else {
      unsignedTransactionBytes = unsignedTransaction;
    }
    const signatureBytes = Crypto.signBytes(unsignedTransactionBytes, signer);
    unsignedTransactionBytes.set(signatureBytes, 96);
    return unsignedTransactionBytes;
  };

  public static oneSigTx = (resultObj: any, signer: string): Buffer => {
    const signature = Buffer.alloc(64);
    const unsignedTransactionBytes = Buffer.concat([
      resultObj.type,
      resultObj.subtype,
      resultObj.timestamp,
      resultObj.deadline,
      resultObj.senderPublicKey,
      resultObj.recipientId,
      resultObj.amount,
      resultObj.fee,
      resultObj.referencedTransactionFullHash,
      signature,
      resultObj.flags,
      resultObj.ecBlockHeight,
      resultObj.ecBlockId,
      resultObj.appendix,
    ]);
    return Transaction.oneSigTxBytes(unsignedTransactionBytes, signer);
  };

  /**
   * Generate Transaction Structure
   * @documentation https://firstb.atlassian.net/wiki/spaces/APOLLO/pages/1250000936/Apollo+Transactions
   */
  public static async sendMoneyTransactionBytes(data: UniversalTransactionData): Promise<string> {
    return this.getTransactionBytes(data, true);
  }

  /**
   * Generate Transaction Structure
   * @documentation https://firstb.atlassian.net/wiki/spaces/APOLLO/pages/1250000936/Apollo+Transactions
   */
  public static async getTransactionBytes(
    data: UniversalTransactionData,
    isTextAttachment: boolean = true,
  ): Promise<string> {
    const getType = (): any => {
      const typeBuf = Buffer.alloc(1);
      const subtypeBuf = Buffer.alloc(1);
      const flagsBuf = Buffer.alloc(4);
      let appendix = Buffer.alloc(0);
      if (data.requestType === 'transferCurrency') {
        typeBuf.writeUInt8(TransactionType.TYPE_MONETARY_SYSTEM, 0);
        const version = 1;
        const subtype = 3;
        subtypeBuf.writeUIntLE((version << 4) & 0xF0 | subtype & 0x0F, 0, 1);
        flagsBuf.writeUIntLE(0x0, 0, 4);
        appendix = Buffer.alloc(1 + 8 + 8);
        appendix.writeUInt8(1, 0); // version
        // @ts-ignore
        appendix.writeBigUInt64LE(BigInt(data.currency), 1);
        // @ts-ignore
        appendix.writeBigUInt64LE(BigInt(data.units), 9);
      } else { // if (data.requestType === 'sendMoney') {
        typeBuf.writeUInt8(TransactionType.TYPE_PAYMENT, 0);
        if (this.checkMultiSig(data.parentSecret, data.senderSecret)) {
          subtypeBuf.writeUInt8(0x20, 0);
        } else {
          subtypeBuf.writeUInt8(0x10, 0);
        }
        if (data.attachment) {
          flagsBuf.writeUIntLE(0x01, 0, 4);
          if (isTextAttachment) {
            const attachmentLength = data.attachment.length;
            appendix = Buffer.alloc(5 + attachmentLength);
            appendix.writeUInt8(1, 0); // version
            appendix.writeIntLE(attachmentLength | 0x80000000, 1, 4); // the payload length max 1000 bytes
            appendix.write(data.attachment, 5); // the byte array of payload
          } else {
            const attachmentBuff: Uint8Array = new Uint8Array(converters.hexStringToByteArray(data.attachment));
            const attachmentLength = attachmentBuff.length;
            appendix = Buffer.alloc(5 + attachmentLength);
            appendix.writeUInt8(1, 0); // version
            appendix.writeIntLE(attachmentLength, 1, 4); // the payload length max 1000 bytes
            appendix.fill(attachmentBuff, 5, 5 + attachmentLength); // the byte array of payload
          }
        } else {
          flagsBuf.writeUIntLE(0x0, 0, 4);
        }
      }
      return {
        type: typeBuf,
        subtype: subtypeBuf,
        flags: flagsBuf,
        appendix,
      };
    };

    try {
      if (!data.feeATM || !(data.recipient || data.parent) || !(data.senderSecret || data.parentSecret)) {
        throw new Error('One or several fields are missing: feeATM, recipient or parent, senderSecret or parentSecret');
      }
      const { type, subtype, flags, appendix } = getType();
      const timestamp = this.getTimestamp(data.txTimestamp);
      const deadline = this.bytesValue(data.deadline || 1440, 2);
      const senderPublicKey = this.getKey((data.senderSecret || data.parentSecret) as string);
      const recipientId = this.getRecipient((data.recipient || data.parent) as string);
      const amount = this.bytesValue(data.amount);
      const fee = this.bytesValue(data.feeATM);
      const referencedTransactionFullHash = Buffer.alloc(32);
      const ecBlockHeight = this.bytesValue(data.ecBlockHeight, 4);
      const ecBlockId = this.bytesValue(data.ecBlockId);

      const resultObj = {
        type,
        subtype,
        timestamp,
        deadline,
        senderPublicKey,
        recipientId,
        amount,
        fee,
        referencedTransactionFullHash,
        flags,
        ecBlockHeight,
        ecBlockId,
        appendix,
      };
      let signedTransactionBytes;
      if (!!data.parentSecret && !!data.senderSecret && data.parentSecret !== data.senderSecret) {
        signedTransactionBytes = this.multiSigTx(resultObj, [data.parentSecret, data.senderSecret]);
      } else if (!!data.senderSecret || !!data.parentSecret) {
        const signer = (data.senderSecret || data.parentSecret) as string;
        signedTransactionBytes = this.oneSigTx(resultObj, signer);
      } else {
        throw new Error('No signers are specified');
      }
      return converters.byteArrayToHexString(signedTransactionBytes);
    } catch (e) {
      console.log(e);
      throw new Error(e.message);
    }
  }

  public static async signTransactionBytes(unsignedTransactionBytes: Buffer, data: any): Promise<string> {
    let signedTransactionBytes;
    if (!!data.parentSecret && !!data.senderSecret && data.parentSecret !== data.senderSecret) {
      signedTransactionBytes = this.multiSigTxBytes(unsignedTransactionBytes, [data.parentSecret, data.senderSecret]);
    } else if (!!data.senderSecret || !!data.parentSecret) {
      const signer = (data.senderSecret || data.parentSecret) as string;
      signedTransactionBytes = this.oneSigTxBytes(unsignedTransactionBytes, signer);
    } else {
      throw new Error('No signers are specified');
    }
    return converters.byteArrayToHexString(signedTransactionBytes);
  }

  /**
   * Generate Transaction Structure
   * @documentation https://firstb.atlassian.net/wiki/spaces/APOLLO/pages/1250000936/Apollo+Transactions
   */
  public static async childAccountTransactionBytes(data: any): Promise<string> {
    const getType = (): any => {
      const typeBuf = Buffer.alloc(1);
      const subtypeBuf = Buffer.alloc(1);
      const flagsBuf = Buffer.alloc(4);
      let appendix = Buffer.alloc(0);

      typeBuf.writeUInt8(TransactionType.TYPE_CHILD_ACCOUNT, 0);
      subtypeBuf.writeUInt8(0x10, 0);
      flagsBuf.writeUIntLE(0x0, 0, 4);
      if (data.publicKeys) {
        const childCountLength = data.publicKeys.length;
        appendix = Buffer.alloc(4 + childCountLength * 32);
        appendix.writeUInt8(1, 0); // version
        appendix.writeUInt8(1, 1); // the Address Scope: 0-External, 1-InFamily, 2-Custom
        appendix.writeUIntLE(childCountLength, 2, 2); // the child count, number of the public key array items
        data.publicKeys.map((child: string, i: number) => {
          const childBuf = Buffer.from(converters.hexStringToByteArray(child));
          appendix.fill(childBuf, 4 + i * 32);
        });
      }
      return {
        type: typeBuf,
        subtype: subtypeBuf,
        flags: flagsBuf,
        appendix,
      };
    };

    try {
      const { type, subtype, flags, appendix } = getType();
      const timestamp = this.getTimestamp(data.txTimestamp);
      const deadline = this.bytesValue(data.deadline || 1440, 2);
      const senderPublicKey = this.getKey(data.senderSecret || data.parentSecret);
      const recipientId = this.getRecipient(data.recipient || data.parent);
      const amount = this.bytesValue(data.amount);
      const fee = this.bytesValue(data.feeATM);
      const referencedTransactionFullHash = Buffer.alloc(32);
      const ecBlockHeight = this.bytesValue(data.ecBlockHeight, 4);
      const ecBlockId = this.bytesValue(data.ecBlockId);

      const resultObj = {
        type,
        subtype,
        timestamp,
        deadline,
        senderPublicKey,
        recipientId,
        amount,
        fee,
        referencedTransactionFullHash,
        flags,
        ecBlockHeight,
        ecBlockId,
        appendix,
      };
      const unsignedTransactionBytes = this.oneSigTx(resultObj, data);
      return converters.byteArrayToHexString(unsignedTransactionBytes);
    } catch (e) {
      console.log(e);
      throw new Error(e.message);
    }
  }

  public static parseTransactionBytes = (transactionBytes: Buffer | string): any => {
    if (transactionBytes) {
      if (typeof transactionBytes === 'string') {
        transactionBytes = Buffer.from(converters.hexStringToByteArray(transactionBytes));
      }
      const senderPublicKey = converters.byteArrayToHexString(transactionBytes.slice(8, 40));
      const recipient = transactionBytes.readBigUInt64LE(40).toString();
      const result = {
        type: transactionBytes.readUInt8(0), // 1
        subtype: transactionBytes.readUInt8(1), // 1
        timestamp: transactionBytes.readUIntLE(2, 4), // 4
        deadline: transactionBytes.readUIntLE(6, 2), // 2
        senderPublicKey, // 32
        sender: Crypto.getAccountIdFromPublicKey(senderPublicKey, false),
        senderRS: Crypto.getAccountIdFromPublicKey(senderPublicKey, true),
        recipient, // 8
        recipientRS: ReedSolomonEncode(recipient), // 8
        amount: transactionBytes.readUIntLE(48, 8), // 8
        fee: transactionBytes.readUIntLE(56, 8), // 8
        referencedTransactionFullHash: converters.byteArrayToHexString(transactionBytes.slice(64, 96)), // 32
        signature: converters.byteArrayToHexString(transactionBytes.slice(96, 160)), // 64
        flags: transactionBytes.readUIntLE(160, 4), // 4
        ecBlockHeight: transactionBytes.readUIntLE(164, 4), // 4
        ecBlockId: transactionBytes.readBigUInt64LE(168).toString(), // 8
      };

      return result;
    }
  };
}
