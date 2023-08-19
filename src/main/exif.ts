import { splitOutsideQuotes } from './util';

export function extractMetadata(pngData: Buffer) {
  const metadata: Record<string, any> = {};

  // Find the position of the first chunk
  let offset = 8;

  while (offset < pngData.length) {
    // Read the chunk length and type
    const length = pngData.readUInt32BE(offset);
    const type = pngData.toString('ascii', offset + 4, offset + 8);

    // Check if the chunk is a tEXt or iTXt chunk
    if (type === 'tEXt' || type === 'iTXt') {
      // Read the keyword (up to null terminator)
      let keyword = '';
      let keywordOffset = offset + 8;
      while (pngData[keywordOffset] !== 0) {
        keyword += String.fromCharCode(pngData[keywordOffset]);
        keywordOffset++;
      }

      // Read the text data
      const textData = pngData.toString(
        'utf8',
        keywordOffset + 1,
        keywordOffset + length - keyword.length - 1
      );

      // Store the metadata in the object
      metadata[keyword] = textData;
    }

    // Move to the next chunk
    offset += length + 12;
  }

  return metadata;
}

export function parseAutomatic1111Meta(parameters: string) {
  const texts = parameters.split(/\r?\n/);
  if (texts.length === 3) {
    const positivePrompt = texts[0];
    const negativePrompt = texts[1].split(': ')[1];
    const keyValuePairs = texts[2] ? splitOutsideQuotes(texts[2]) : [];

    const data = keyValuePairs.reduce(
      (acc: Record<string, string>, pair: string) => {
        const [key, value] = pair.split(': ');
        acc[key.replace(' ', '_')] = value;
        return acc;
      },
      {}
    );

    data.positivePrompt = positivePrompt;
    data.negativePrompt = negativePrompt;
    return data;
  }
  return null;
}
