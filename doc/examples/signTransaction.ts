import { Transaction } from "apl-web-crypto";
require("dotenv").config();

(async () => {
    const ONE_APL = 100000000;
    const data = {
	  requestType: 'sendMoney',
          publicKey: "24a88cc13c9a3a9f06c636b58c5b607fcb7cff14d449325691fa448933e6b870",
	  amountATM: 2 * ONE_APL,
          feeATM: ONE_APL,
	  deadline: 60,
          recipient: "APL-RQTU-56W2-AAMY-7MTLB"
        };

    // function getNotSignedData used to get transaction bytes without signing
    const getNotSignedData = async (dataObj) =>
    {
	return await Transaction.sendNotSign(dataObj);
    }

    const sign = async (secretPhrase, unsignedResponse) => 
    {
	const result = await Transaction.processOfflineSign(secretPhrase, unsignedResponse);
        return result;
    }

    try {
	   const unsignedResponse = await getNotSignedData(data);
           // process unsigned transaction here
	   console.log(unsignedResponse);
	   
	   // Here is the sample secretPhrase. Should be the working secretPhrase
	   const secretPhrase = '10';
           const signedBytes = await sign(secretPhrase, unsignedResponse)
	   // process signed transaction here
           console.log(signedBytes);
    } catch (e) {
           console.log(e);
    }
})();