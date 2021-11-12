import { BigInteger } from 'jsbn';
import * as ApolloApi from './apollo-api-v2/api';
import Transaction from './Transaction';
import Crypto from './Crypto';
import ElGamalEncryption from './ElGamalEncryption';
import { ReedSolomonDecode, ReedSolomonEncode } from './ReedSolomon';

export const processAccountIDtoRS = (accountID: number | string, prefix?: string) => {
  return ReedSolomonEncode(accountID, prefix);
};

export const processAccountRStoID = (accountRS: string) => {
  return ReedSolomonDecode(accountRS);
};

export const processAccountRStoHex = (accountRS: string, needPrefix: boolean = false) => {
  const accountID = ReedSolomonDecode(accountRS);
  const hexString = new BigInteger(accountID).toString(16);
  const additionalElement = hexString.length % 2 > 0 ? '0' : '';
  return needPrefix ? `0x${additionalElement}${hexString}` : hexString;
};

export { Transaction, Crypto, ElGamalEncryption, ApolloApi };
