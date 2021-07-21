import { BigInteger } from 'jsbn';
import * as ApolloApi from './apollo-api-v2/api';
import Transaction from './Transaction';
import Crypto from './Crypto';
import ElGamalEncryption from './ElGamalEncryption';
import { ReedSolomonDecode, ReedSolomonEncode } from './ReedSolomon';

export const processAccountIDtoRS = (accountID: number | string) => {
  return ReedSolomonEncode(accountID);
};

export const processAccountRStoID = (accountRS: string) => {
  return ReedSolomonDecode(accountRS);
};

export const processAccountRStoHex = (accountRS: string, needPrefix: boolean = false) => {
  const accountID = ReedSolomonDecode(accountRS);
  const hexString = new BigInteger(accountID).toString(16);
  return needPrefix ? `0x${hexString}` : hexString;
};

export { Transaction, Crypto, ElGamalEncryption, ApolloApi };
