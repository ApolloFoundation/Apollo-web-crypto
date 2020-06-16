const initialCodeword = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const gexp = [1, 2, 4, 8, 16, 5, 10, 20, 13, 26, 17, 7, 14, 28, 29, 31, 27, 19, 3, 6, 12, 24, 21, 15, 30, 25, 23, 11, 22, 9, 18, 1];
const glog = [0, 0, 1, 18, 2, 5, 19, 11, 3, 29, 6, 27, 20, 8, 12, 23, 4, 10, 30, 17, 7, 22, 28, 26, 21, 25, 9, 16, 13, 14, 24, 15];
const codewordMap = [3, 2, 1, 0, 7, 6, 5, 4, 13, 14, 15, 16, 12, 8, 9, 10, 11];
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const base32Length = 13;
const base10Length = 20;
const DEFAULT_PREFIX = "APL-";

export const ReedSolomonEncode = (id: number | string) => {
    const idString = id.toString();
    let idLength = idString.length;
    let idArray = new Array(base10Length).fill(0);
    for (let i = 0; i < idLength; i++) {
        idArray[i] = idString.charAt(i);
    }
    let codewordLength = 0;
    let codeword = new Array(initialCodeword.length).fill(0);
    do {  // base 10 to base 32 conversion
        let newLength = 0;
        let digit32 = 0;
        for (let i = 0; i < idLength; i++) {
            digit32 = digit32 * 10 + parseInt(idArray[i]);
            if (digit32 >= 32) {
                idArray[newLength] = digit32 >> 5;
                digit32 &= 31;
                newLength += 1;
            } else if (newLength > 0) {
                idArray[newLength] = 0;
                newLength += 1;
            }
        }
        idLength = newLength;
        codeword[codewordLength] = digit32;
        codewordLength += 1;
    } while(idLength > 0);
    let p = [0, 0, 0, 0];
    for (let i = base32Length - 1; i >= 0; i--) {
        const fb = codeword[i] ^ p[3];
        p[3] = p[2] ^ gmult(30, fb);
        p[2] = p[1] ^ gmult(6, fb);
        p[1] = p[0] ^ gmult(9, fb);
        p[0] = gmult(17, fb);
    }
    codeword = [...codeword.slice(0, base32Length), ...p.slice(0, initialCodeword.length - base32Length)];
    let accountRS = '';
    for (let i = 0; i < 17; i++) {
        const codeworkIndex = codewordMap[i];
        const alphabetIndex = codeword[codeworkIndex];
        accountRS += alphabet.charAt(alphabetIndex);

        if ((i & 3) === 3 && i < 13) {
            accountRS += '-';
        }
    }
    return DEFAULT_PREFIX + accountRS.toString();
};

export const ReedSolomonDecode = (accountRS: string) => {
    let codeword = new Array(initialCodeword.length).fill(0);
    codeword = [...initialCodeword.slice(0, initialCodeword.length - 1), ...codeword.slice(initialCodeword.length - 1, codeword.length)];

    if (accountRS.slice(0,4) === 'APL-') {
        accountRS = accountRS.replace('APL-', '');
    }
    let accountRSLength = accountRS.length;
    let codewordLength = 0;
    for (let i = 0; i < accountRSLength; i++) {
        const positionInAlphabet = alphabet.indexOf(accountRS.charAt(i));
        if (positionInAlphabet <= -1 || positionInAlphabet > alphabet.length) {
            continue;
        }

        if (codewordLength > 16) {
            console.log("Codeword too long");
            return null;
        }

        const codeworkIndex = codewordMap[codewordLength];
        codeword[codeworkIndex] = positionInAlphabet;
        codewordLength += 1;
    }

    if (codewordLength === 17 && !isCodewordValid(codeword) || codewordLength !== 17) {
        console.log("Codeword invalid");
        return null;
    }
    let length = base32Length;
    let cypherString32 = new Array(length).fill(0);
    for (let i = 0; i < length; i++) {
        cypherString32[i] = codeword[length - i - 1];
    }

    let plainStringBuilder: any = '';
    do { // base 32 to base 10 conversion
        let newLength = 0;
        let digit10 = 0;

        for (let i = 0; i < length; i++) {
            digit10 = digit10 * 32 + parseInt(cypherString32[i]);

            if (digit10 >= 10) {
                cypherString32[newLength] = digit10 / 10;
                digit10 %= 10;
                newLength += 1;
            } else if (newLength > 0) {
                cypherString32[newLength] = 0;
                newLength += 1;
            }
        }
        length = newLength;
        plainStringBuilder += digit10;
    } while (length > 0);
    plainStringBuilder = plainStringBuilder.split("");
    return plainStringBuilder.reverse().join('');
};

const isCodewordValid = (codeword: any) => {
    let sum = 0;
    for (let i = 1; i < 5; i++) {
        let t = 0;
        for (let j = 0; j < 31; j++) {
            if (j > 12 && j < 27) {
                continue;
            }
            let pos = j;
            if (j > 26) {
                pos -= 14;
            }
            t ^= gmult(codeword[pos], gexp[(i * j) % 31]);
        }
        sum |= t;
    }

    return sum === 0;
};

const gmult = (a: number, b: number) => {
    if (a === 0 || b === 0) {
        return 0;
    }
    const idx = (glog[a] + glog[b]) % 31;
    return gexp[idx];
};
