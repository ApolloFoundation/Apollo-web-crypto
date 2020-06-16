import Transaction from "./Transaction";
import Crypto from "./Crypto";
import ElGamalEncryption from "./ElGamalEncryption";
import { ReedSolomonDecode, ReedSolomonEncode } from "./ReedSolomon";

export const processAccountIDtoRS = (accountID: number | string) => {
  return ReedSolomonEncode(accountID);
};

export const processAccountRStoID = (accountRS: string) => {
  return ReedSolomonDecode(accountRS);
};

export {
  Transaction,
  Crypto,
  ElGamalEncryption
}
