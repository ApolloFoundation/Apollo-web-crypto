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
    recipient: 'APL-RQTU-56W2-AAMY-7MTLB',
  };

  // function notSign used to get transaction bytes without signing
  const getNotSignedData = async (dataObj) => {
    return await Transaction.sendNotSign(dataObj);
  };

  const sign = async (secretPhrase, unsignedResponse) => {
    const sendData = { secretPhrase };
    return await Transaction.processOfflineSign(sendData, unsignedResponse);
  };

  try {
    // process unsigned transaction here
    const unsignedResponse = await getNotSignedData(data);
    console.log(unsignedResponse);

    // process signed transaction here
    const signedBytes = await sign(secretPhrase, unsignedResponse);
    console.log(signedBytes);
  } catch (e) {
    console.log(e);
  }
})();
