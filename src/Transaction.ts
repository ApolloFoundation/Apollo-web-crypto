import Crypto from './Crypto';
import ElGamalEncryption from './ElGamalEncryption';
import { GET, handleFetch, POST } from './helpers/fetch';
import converters from './util/converters';
import { ReedSolomonDecode } from './ReedSolomon';
import { TransactionType } from './constants/TransactionType';
import { StateApi } from './apollo-api-v2/api/stateApi';

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

  /**
   * Generate Transaction Structure
   * @documentation https://firstb.atlassian.net/wiki/spaces/APOLLO/pages/1250000936/Apollo+Transactions
   */
  public static async generateTransactionBytes(data: any): Promise<any> {
    const bytesValue = (value: number | string | undefined = 0, bytes: number = 8) => {
      const resBuff = Buffer.alloc(8);
      const valueBigInt = BigInt(value);
      resBuff.writeBigUInt64LE(valueBigInt, 0);
      return resBuff.slice(0, bytes);
    };
    const getType = (requestType: string): any => {
      const typeBuf = Buffer.alloc(1);
      const subtypeBuf = Buffer.alloc(1);
      const flagsBuf = Buffer.alloc(4);
      let appendix = Buffer.alloc(0);
      switch (requestType) {
        case 'sendMoney':
          typeBuf.writeUInt8(TransactionType.TYPE_PAYMENT, 0);
          subtypeBuf.writeUInt8(0x20, 0);
          if (data.attachment) {
            flagsBuf.writeUIntLE(0x01, 0, 4);
            const attachmentLength = data.attachment.length;
            appendix = Buffer.alloc(5 + attachmentLength);
            appendix.writeUInt8(1, 0); // version
            appendix.writeIntLE(attachmentLength | 0x80000000, 1, 4); // the payload length max 1000 bytes
            appendix.write(data.attachment, 5, attachmentLength); // the byte array of payload
          } else {
            flagsBuf.writeUIntLE(0x0, 0, 4);
          }
          break;
        case 'childAccount':
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
              appendix.fill(childBuf, 4 + i * 32, 32);
            });
          }
          break;
      }
      return {
        type: typeBuf,
        subtype: subtypeBuf,
        flags: flagsBuf,
        appendix,
      };
    };
    const getTimestamp = (value: number | undefined = 0) => {
      const timestampBuf = Buffer.alloc(4);
      timestampBuf.writeUIntLE(value, 0, 4);
      return timestampBuf;
    };
    const getKey = (secretPhrase: string): Buffer => {
      const secretPhraseHex = Crypto.getPublicKey(secretPhrase);
      const secretPhraseBytes = converters.hexStringToByteArray(secretPhraseHex);
      return Buffer.from(secretPhraseBytes);
    };
    const getRecipient = (recipient: string) => {
      const resBuff = Buffer.alloc(8);
      if (recipient && recipient.length > 0) {
        const recipientID: string = ReedSolomonDecode(recipient);
        const bigIntRes = BigInt(recipientID);
        resBuff.writeBigUInt64LE(bigIntRes, 0);
      }
      return resBuff;
    };
    const getBlockchain = async () => {
      const stateApi = new StateApi();
      stateApi.basePath = process.env.APL_SERVER || 'http://localhost:7876/rest';
      return stateApi.getBlockchainInfo();
    };

    try {
      const blockchainResult = await getBlockchain();

      const { type, subtype, flags, appendix } = getType(data.requestType);
      const timestamp = getTimestamp(blockchainResult.body.txTimestamp);
      const deadline = bytesValue(data.deadline || 1440, 2);
      const senderPublicKey = getKey(data.senderSecret || data.parentSecret);
      const recipientId = getRecipient(data.recipient || data.parent);
      const amount = bytesValue(data.amount);
      const fee = bytesValue(data.fee);
      const referencedTransactionFullHash = Buffer.alloc(32);
      const ecBlockHeight = bytesValue(blockchainResult.body.ecBlockHeight, 4);
      const ecBlockId = bytesValue(blockchainResult.body.ecBlockId);

      const multiSigTx = () => {
        const transactionBytes = Buffer.concat([
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
        ]);

        const magic = Buffer.from('MSIG');
        const reserved = Buffer.alloc(4);
        const participantNumber = Buffer.alloc(2);
        participantNumber.writeUInt8(2, 0);
        const keyId = senderPublicKey.slice(0, 8);
        const signature = Crypto.signBytes(transactionBytes, data.senderSecret);
        const keyIdParent = getKey(data.parentSecret).slice(0, 8);
        const signatureParent = Crypto.signBytes(transactionBytes, data.parentSecret);
        const signatureBytes = Buffer.concat([
          magic,
          reserved,
          participantNumber,
          keyId,
          signature,
          keyIdParent,
          signatureParent,
        ]);

        return Buffer.concat([transactionBytes, signatureBytes]);
      };

      const oneSigTx = () => {
        const signature = Buffer.alloc(64);
        const resultBytes = Buffer.concat([
          type,
          subtype,
          timestamp,
          deadline,
          senderPublicKey,
          recipientId,
          amount,
          fee,
          referencedTransactionFullHash,
          signature,
          flags,
          ecBlockHeight,
          ecBlockId,
          appendix,
        ]);
        const signatureBytes = Crypto.signBytes(resultBytes, data.senderSecret || data.parentSecret);
        resultBytes.set(signatureBytes, 96);
        return resultBytes;
      };

      const unsignedTransactionBytes = data.requestType === 'childAccount' ? oneSigTx() : multiSigTx();
      return converters.byteArrayToHexString(unsignedTransactionBytes);
    } catch (e) {
      console.log(e);
      throw new Error(e.message);
    }
  }
}
