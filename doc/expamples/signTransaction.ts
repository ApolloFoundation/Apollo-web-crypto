import { Transaction } from "apl-web-crypto";
require("dotenv").config()

const ONE_APL = 100000000;
const data = {
      requestType: 'sendMoney',
//      publicKey: '39dc2e813bb45ff063a376e316b10cd0addd7306555ca0dd2890194d37960152',
     publicKey: "24a88cc13c9a3a9f06c636b58c5b607fcb7cff14d449325691fa448933e6b870",
      amountATM: 2 * ONE_APL,
      feeATM: ONE_APL,
      deadline: 60,
      recipient: "APL-RQTU-56W2-AAMY-7MTLB"
    };

async function notSign(data)
{
    const result = await Transaction.sendNotSign(data);
    return result;
}

async function sign(secretPhrase, unsignedResponse)
{
    const sendData =  {secretPhrase: secretPhrase };
    const result = await Transaction.processOfflineSign(sendData, unsignedResponse);
    return result;
}

async function broadcast(signedResponse)
{
    await Transaction.send(signedResponse);
}

let unsignedTransactionData = notSign(data)
.then(unsignedResponse => {
    console.log(unsignedResponse);
    sign("10", unsignedResponse).then(signedBytes => {
	console.log(signedBytes);
    }).catch();
    

})
.catch();
