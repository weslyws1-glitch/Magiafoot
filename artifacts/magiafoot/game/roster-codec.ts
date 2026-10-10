// Descompactador LZ compatível com os elencos compactados da temporada 2026.
// Baseado no formato LZ-String (MIT, https://github.com/pieroxy/lz-string).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
export function decompressRosterBase64(source: string): string | null {
  if (!source) return '';
  const getValue = (index: number) => B64.indexOf(source.charAt(index));
  const length = source.length;
  let val = getValue(0);
  let position = 32;
  let index = 1;
  const readBits = (number: number) => {
    let result = 0;
    for (let power = 1, max = 1 << number; power < max; power <<= 1) {
      if (val & position) result |= power;
      position >>= 1;
      if (position === 0) {
        position = 32;
        val = getValue(index++);
      }
    }
    return result;
  };
  const dictionary: string[] = ['', '', ''];
  let c: string;
  const start = readBits(2);
  if (start === 0) c = String.fromCharCode(readBits(8));
  else if (start === 1) c = String.fromCharCode(readBits(16));
  else return '';
  dictionary[3] = c;
  let word = c;
  const result = [c];
  let dictSize = 4;
  let enlargeIn = 4;
  let numBits = 3;
  while (index <= length) {
    let next = readBits(numBits);
    if (next === 0) {
      dictionary[dictSize++] = String.fromCharCode(readBits(8));
      next = dictSize - 1;
      enlargeIn--;
    } else if (next === 1) {
      dictionary[dictSize++] = String.fromCharCode(readBits(16));
      next = dictSize - 1;
      enlargeIn--;
    } else if (next === 2) {
      return result.join('');
    }
    if (enlargeIn === 0) {
      enlargeIn = 1 << numBits;
      numBits++;
    }
    let entry: string;
    if (dictionary[next] !== undefined) {
      entry = dictionary[next];
    } else if (next === dictSize) {
      entry = word + word.charAt(0);
    } else {
      return null;
    }
    result.push(entry);
    dictionary[dictSize++] = word + entry.charAt(0);
    enlargeIn--;
    word = entry;
    if (enlargeIn === 0) {
      enlargeIn = 1 << numBits;
      numBits++;
    }
  }
  return null;
}
