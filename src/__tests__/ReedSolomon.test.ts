import { ReedSolomonDecode, ReedSolomonEncode } from "../ReedSolomon";

const accountID = "9211698109297098287"
const accountRS = "APL-NZKH-MZRE-2CTT-98NPZ"

describe('Reed-Solomon Tests', () => {
  test('Account ID to RS', async () => {
    const resultRS = ReedSolomonEncode(accountID)
    expect(resultRS).toEqual(accountRS);
  });

  test('Account RS to ID', async () => {
    const resultID = ReedSolomonDecode(accountRS)
    expect(resultID).toEqual(accountID);
  });
});
