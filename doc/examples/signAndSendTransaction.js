const { Crypto, Transaction } = require('apl-web-crypto');
require('dotenv').config();

(async () => {
  // Apollo has 8 decimals
  const ONE_APL = 100000000;
  const secretPhrase = '10';
  const publicKey = Crypto.getPublicKey(secretPhrase);
  const data = {
    requestType: 'sendMoney',
    publicKey,
    amountATM: 2 * ONE_APL,
    feeATM: ONE_APL,
    deadline: 60,
    recipient: "APL-RQTU-56W2-AAMY-7MTLB",
    secretPhrase
  };

  const signAndSend = async (dataObj) => {
    return await Transaction.sendWithOfflineSign(dataObj);
  }

  try {
    const serverResponse = await signAndSend(data)
    console.log(serverResponse);
  } catch (e) {
    console.log(e);
  }
})();
