import { Transaction } from "apl-web-crypto";
require("dotenv").config()

const ONE_APL = 100000000;
const data = {
      requestType: 'sendMoney',
      publicKey: "24a88cc13c9a3a9f06c636b58c5b607fcb7cff14d449325691fa448933e6b870",
      amountATM: 2 * ONE_APL,
      feeATM: ONE_APL,
      deadline: 60,
      recipient: "APL-RQTU-56W2-AAMY-7MTLB",
      secretPhrase: '10'
    };

async function signAndSend(data)
{
    const result = await Transaction.sendWithOfflineSign(data);
    return result;
}

let serverResponse  = signAndSend(data)
.then(response => {
    console.log(response);
})
.catch();
