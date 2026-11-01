// Temporary passwords that are easy to read out or type over from WhatsApp: no look-alike characters (0/O, 1/l/I),
// grouped in fours. 16 characters from a 54-character alphabet is about 92 bits, far beyond guessing.
const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword(random: (size: number) => Uint8Array = (size) => crypto.getRandomValues(new Uint8Array(size))) {
  const chars: string[] = [];
  // Rejection sampling keeps every character equally likely (256 is not a multiple of the alphabet size).
  const limit = 256 - (256 % alphabet.length);
  while (chars.length < 16) for (const byte of random(32)) if (byte < limit && chars.length < 16) chars.push(alphabet[byte % alphabet.length]);
  return chars.join("").match(/.{4}/g)!.join("-");
}
