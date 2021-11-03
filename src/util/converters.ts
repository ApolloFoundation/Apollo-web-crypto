/** ****************************************************************************
 * Copyright © 2013-2016 The Nxt Core Developers.                             *
 * Copyright © 2016-2020 Jelurida IP B.V.                                     *
 *                                                                            *
 * See the LICENSE.txt file at the top-level directory of this distribution   *
 * for licensing information.                                                 *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement with Jelurida B.V.,*
 * no part of the Nxt software, including this file, may be copied, modified, *
 * propagated, or distributed except according to the terms contained in the  *
 * LICENSE.txt file.                                                          *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ***************************************************************************** */

// @ts-nocheck
import * as CryptoJS from 'crypto-js';
import { BigInteger } from 'jsbn';

const charToNibble = {};
const nibbleToChar = [];
let i;
for (i = 0; i <= 9; ++i) {
  const character = i.toString();
  charToNibble[character] = i;
  nibbleToChar.push(character);
}

for (i = 10; i <= 15; ++i) {
  const lowerChar = String.fromCharCode('a'.charCodeAt(0) + i - 10);
  const upperChar = String.fromCharCode('A'.charCodeAt(0) + i - 10);

  charToNibble[lowerChar] = i;
  charToNibble[upperChar] = i;
  nibbleToChar.push(lowerChar);
}

export default {
  byteArrayToHexString(bytes) {
    let str = '';
    for (let i = 0; i < bytes.length; ++i) {
      if (bytes[i] < 0) {
        bytes[i] += 256;
      }
      str += nibbleToChar[bytes[i] >> 4] + nibbleToChar[bytes[i] & 0x0f];
    }

    return str;
  },
  stringToByteArray(str) {
    str = unescape(encodeURIComponent(str)); // temporary

    const bytes = new Array(str.length);
    for (let i = 0; i < str.length; ++i) bytes[i] = str.charCodeAt(i);

    return bytes;
  },
  hexStringToByteArray(str) {
    const bytes = [];
    let i = 0;
    if (str.length % 2 !== 0) {
      bytes.push(charToNibble[str.charAt(0)]);
      ++i;
    }

    for (; i < str.length - 1; i += 2) bytes.push((charToNibble[str.charAt(i)] << 4) + charToNibble[str.charAt(i + 1)]);

    return bytes;
  },
  stringToHexString(str) {
    return this.byteArrayToHexString(this.stringToByteArray(str));
  },
  hexStringToString(hex) {
    return this.byteArrayToString(this.hexStringToByteArray(hex));
  },
  stringToHexStringToByteArray(str) {
    return this.hexStringToByteArray(this.stringToHexString(str));
  },
  checkBytesToIntInput(bytes, numBytes, opt_startIndex) {
    const startIndex = opt_startIndex || 0;
    if (startIndex < 0) {
      throw new Error('Start index should not be negative');
    }

    if (bytes.length < startIndex + numBytes) {
      throw new Error(`Need at least ${numBytes} bytes to convert to an integer`);
    }
    return startIndex;
  },
  byteArrayToSignedShort(bytes, opt_startIndex) {
    const index = this.checkBytesToIntInput(bytes, 2, opt_startIndex);
    let value = bytes[index];
    value += bytes[index + 1] << 8;
    return value;
  },
  byteArrayToSignedInt32(bytes, opt_startIndex) {
    const index = this.checkBytesToIntInput(bytes, 4, opt_startIndex);
    value = bytes[index];
    value += bytes[index + 1] << 8;
    value += bytes[index + 2] << 16;
    value += bytes[index + 3] << 24;
    return value;
  },
  byteArrayToBigInteger(bytes, optStartIndex: number = 0) {
    let value = new BigInteger('0', 10);

    let temp1;
    let temp2;

    for (let i = 7; i >= 0; i--) {
      temp1 = value.multiply(new BigInteger('256', 10));
      temp2 = temp1.add(new BigInteger(bytes[optStartIndex + i].toString(10), 10));
      value = temp2;
    }

    return value;
  },
  // create a wordArray that is Big-Endian
  byteArrayToWordArray(byteArray): any {
    let i = 0;
    let offset = 0;
    let word = 0;
    const len = byteArray.length;
    const words = new Uint32Array(((len / 4) | 0) + (len % 4 == 0 ? 0 : 1));

    while (i < len - (len % 4)) {
      words[offset++] = (byteArray[i++] << 24) | (byteArray[i++] << 16) | (byteArray[i++] << 8) | byteArray[i++];
    }
    if (len % 4 != 0) {
      word = byteArray[i++] << 24;
      if (len % 4 > 1) {
        word |= byteArray[i++] << 16;
      }
      if (len % 4 > 2) {
        word |= byteArray[i++] << 8;
      }
      words[offset] = word;
    }
    const wordArray = new Object();
    wordArray.sigBytes = len;
    wordArray.words = words;

    return wordArray;
  },
  // assumes wordArray is Big-Endian
  wordArrayToByteArray(wordArray) {
    return this.wordArrayToByteArrayImpl(wordArray, true);
  },
  wordArrayToByteArrayImpl(wordArray, isFirstByteHasSign) {
    const len = wordArray.words.length;
    if (len == 0) {
      return new Array(0);
    }
    const byteArray = new Array(wordArray.sigBytes);
    let offset = 0;
    let word;
    let i;
    for (i = 0; i < len - 1; i++) {
      word = wordArray.words[i];
      byteArray[offset++] = isFirstByteHasSign ? word >> 24 : (word >> 24) & 0xff;
      byteArray[offset++] = (word >> 16) & 0xff;
      byteArray[offset++] = (word >> 8) & 0xff;
      byteArray[offset++] = word & 0xff;
    }
    word = wordArray.words[len - 1];
    byteArray[offset++] = isFirstByteHasSign ? word >> 24 : (word >> 24) & 0xff;
    if (wordArray.sigBytes % 4 == 0) {
      byteArray[offset++] = (word >> 16) & 0xff;
      byteArray[offset++] = (word >> 8) & 0xff;
      byteArray[offset++] = word & 0xff;
    }
    if (wordArray.sigBytes % 4 > 1) {
      byteArray[offset++] = (word >> 16) & 0xff;
    }
    if (wordArray.sigBytes % 4 > 2) {
      byteArray[offset++] = (word >> 8) & 0xff;
    }
    return byteArray;
  },
  byteArrayToString(bytes, opt_startIndex?, length?) {
    if (length == 0) {
      return '';
    }

    if (opt_startIndex && length) {
      const index = this.checkBytesToIntInput(bytes, parseInt(length, 10), parseInt(opt_startIndex, 10));

      bytes = bytes.slice(opt_startIndex, opt_startIndex + length);
    }

    return decodeURIComponent(escape(String.fromCharCode.apply(null, bytes)));
  },
  byteArrayToShortArray(byteArray) {
    const shortArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let i;
    for (i = 0; i < 16; i++) {
      shortArray[i] = byteArray[i * 2] | (byteArray[i * 2 + 1] << 8);
    }
    return shortArray;
  },
  shortArrayToByteArray(shortArray) {
    const byteArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let i;
    for (i = 0; i < 16; i++) {
      byteArray[2 * i] = shortArray[i] & 0xff;
      byteArray[2 * i + 1] = shortArray[i] >> 8;
    }

    return byteArray;
  },
  shortArrayToHexString(ary) {
    let res = '';
    for (let i = 0; i < ary.length; i++) {
      res +=
        nibbleToChar[(ary[i] >> 4) & 0x0f] +
        nibbleToChar[ary[i] & 0x0f] +
        nibbleToChar[(ary[i] >> 12) & 0x0f] +
        nibbleToChar[(ary[i] >> 8) & 0x0f];
    }
    return res;
  },
  /**
   * Produces an array of the specified number of bytes to represent the integer
   * value. Default output encodes ints in little endian format. Handles signed
   * as well as unsigned integers. Due to limitations in JavaScript's number
   * format, x cannot be a true 64 bit integer (8 bytes).
   */
  intToBytes_(x, numBytes, unsignedMax, opt_bigEndian) {
    const signedMax = Math.floor(unsignedMax / 2);
    const negativeMax = (signedMax + 1) * -1;
    if (x != Math.floor(x) || x < negativeMax || x > unsignedMax) {
      throw new Error(`${x} is not a ${numBytes * 8} bit integer`);
    }
    const bytes = [];
    let current;
    // Number type 0 is in the positive int range, 1 is larger than signed int,
    // and 2 is negative int.
    const numberType = x >= 0 && x <= signedMax ? 0 : x > signedMax && x <= unsignedMax ? 1 : 2;
    if (numberType == 2) {
      x = x * -1 - 1;
    }
    for (let i = 0; i < numBytes; i++) {
      if (numberType == 2) {
        current = 255 - (x % 256);
      } else {
        current = x % 256;
      }

      if (opt_bigEndian) {
        bytes.unshift(current);
      } else {
        bytes.push(current);
      }

      if (numberType == 1) {
        x = Math.floor(x / 256);
      } else {
        x >>= 8;
      }
    }
    return bytes;
  },
  int32ToBytes(x, opt_bigEndian) {
    return converters.intToBytes_(x, 4, 4294967295, opt_bigEndian);
  },
  /**
   * Based on https://groups.google.com/d/msg/crypto-js/TOb92tcJlU0/Eq7VZ5tpi-QJ
   * Converts a word array to a Uint8Array.
   * @param {WordArray} wordArray The word array.
   * @return {Uint8Array} The Uint8Array.
   */
  wordArrayToByteArrayEx(wordArray) {
    // Shortcuts
    const { words } = wordArray;
    const { sigBytes } = wordArray;

    // Convert
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
      const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      u8[i] = byte;
    }

    return u8;
  },
  /**
   * Converts a Uint8Array to a word array.
   * @param {string} u8Str The Uint8Array.
   * @return {WordArray} The word array.
   */
  byteArrayToWordArrayEx(u8arr): any {
    // Shortcut
    const len = u8arr.length;

    // Convert
    const words = [];
    for (let i = 0; i < len; i++) {
      words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8);
    }

    return CryptoJS.lib.WordArray.create(words, len);
  },
};
