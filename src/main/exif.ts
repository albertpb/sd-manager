import { ImageMetaData } from './interfaces';

export function splitOutsideQuotes(input: string): string[] {
  const regex = /([ 0-9a-zA-Z]+: "[^"]+")/g;
  const parts = input.match(regex);
  let arr: string[] = [];
  if (parts !== null) {
    arr = arr.concat(parts.map((part) => part.trim()));
  }
  const cleanTxt = input
    .replace(regex, '')
    .split(',')
    .reduce((acc: string[], part) => {
      const p = part.trim();
      if (p !== '') acc.push(p);
      return acc;
    }, []);
  return arr.concat(cleanTxt);
}

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
      while (
        pngData[keywordOffset] !== 0 &&
        keywordOffset < offset + length + 8
      ) {
        keyword += String.fromCharCode(pngData[keywordOffset]);
        keywordOffset++;
      }

      // Read the text data
      const textData = pngData.toString(
        'utf8',
        keywordOffset + 1,
        offset + length + 8,
      );

      // Store the metadata in the object
      metadata[keyword] = textData;
    }

    // Move to the next chunk
    offset += length + 12;
  }

  return metadata;
}

export function parseAutomatic1111Meta(parameters: string): ImageMetaData {
  const texts = parameters.split(/\r?\n/).map((t) => t.trim());

  const keyValuePairsIndex = texts.findIndex((t) => t.startsWith('Steps:'));
  const negativeIndex = texts.findIndex((t) =>
    t.startsWith('Negative prompt:'),
  );

  let positivePrompt = '';
  if (negativeIndex !== -1 && texts[negativeIndex - 1] !== undefined) {
    positivePrompt = texts[negativeIndex - 1];
  } else if (
    negativeIndex === -1 &&
    texts[keyValuePairsIndex - 1] !== undefined
  ) {
    positivePrompt = texts[keyValuePairsIndex - 1];
  }

  const negativePrompt =
    negativeIndex !== -1 ? texts[negativeIndex].split(': ')[1] : '';
  const keyValuePairs =
    keyValuePairsIndex !== -1
      ? splitOutsideQuotes(texts[keyValuePairsIndex])
      : [];

  const data = keyValuePairs.reduce(
    (acc: Record<string, string>, pair: string) => {
      const [key, value] = pair.split(': ');
      acc[key.replace(' ', '_')] = value;
      return acc;
    },
    {},
  );

  const params: ImageMetaData = {
    positivePrompt,
    negativePrompt,
    cfg: data.CFG_scale,
    seed: data.Seed,
    steps: data.Steps,
    model: data.Model,
    sampler: data.Sampler,
    scheduler: data.Sampler,
    generatedBy: 'automatic1111',
  };

  return params;
}

export function parseComfyUiMeta(workflow: string): ImageMetaData {
  const parsed = JSON.parse(workflow);

  const params: ImageMetaData = {
    positivePrompt: '',
    negativePrompt: '',
    cfg: '',
    model: '',
    sampler: '',
    scheduler: '',
    seed: '',
    steps: '',
    generatedBy: 'ComfyUi',
  };

  if (parsed.nodes && Array.isArray(parsed.nodes)) {
    let KSamplerNode = parsed.nodes.find(
      (node: Record<string, any>) => node.type === 'KSamplerAdvanced',
    );

    if (KSamplerNode) {
      params.seed = `${KSamplerNode.widgets_values[1]}`;
      params.cfg = `${KSamplerNode.widgets_values[4]}`;
      params.steps = `${KSamplerNode.widgets_values[3]}`;
      params.scheduler = `${KSamplerNode.widgets_values[6]}`;
      params.sampler = `${KSamplerNode.widgets_values[5]}`;
    } else {
      KSamplerNode = parsed.nodes.find(
        (node: Record<string, any>) => node.type === 'KSampler',
      );

      if (KSamplerNode) {
        params.seed = `${KSamplerNode.widgets_values[0]}`;
        params.cfg = `${KSamplerNode.widgets_values[3]}`;
        params.steps = `${KSamplerNode.widgets_values[2]}`;
        params.scheduler = `${KSamplerNode.widgets_values[4]}`;
        params.sampler = `${KSamplerNode.widgets_values[5]}`;
      }
    }

    if (KSamplerNode) {
      let positiveLink = 0;
      let negativeLink = 0;

      for (let j = 0; j < KSamplerNode.inputs.length; j++) {
        const input = KSamplerNode.inputs[j];
        if (input.name === 'positive') {
          positiveLink = input.link;
        }
        if (input.name === 'negative') {
          negativeLink = input.link;
        }
      }

      for (let i = 0; i < parsed.nodes.length; i++) {
        const node: Record<string, any> = parsed.nodes[i];

        if (node.type === 'CLIPTextEncode') {
          if (node.outputs[0] && node.outputs[0].links[0]) {
            if (node.outputs[0].links[0] === positiveLink) {
              params.positivePrompt = node.widgets_values[0];
            }
            if (node.outputs[0].links[0] === negativeLink) {
              params.negativePrompt = node.widgets_values[0];
            }
          }
        }

        if (node.type === 'CheckpointLoaderSimple') {
          params.model = node.widgets_values[0].replace(
            /.safetensors|.ckpt/g,
            '',
          );
        }
      }
    }
  }
  return params;
}

export const parseInvokeAIMeta = (invokeaiMetadata: string) => {
  console.log(invokeaiMetadata);

  const parsed = JSON.parse(invokeaiMetadata);

  const params: ImageMetaData = {
    positivePrompt: parsed.positive_prompt,
    negativePrompt: parsed.negative_prompt,
    cfg: `${parsed.cfg_scale}`,
    seed: `${parsed.seed}`,
    steps: `${parsed.steps}`,
    model: parsed.model.model_name,
    sampler: parsed.scheduler,
    scheduler: parsed.scheduler,
    generatedBy: 'InvokeAI',
  };

  console.log(params);

  return params;
};

export const parseImageSdMeta = (exif: Record<string, any>) => {
  let metadata: ImageMetaData = {
    cfg: '',
    generatedBy: '',
    model: 'unknown',
    negativePrompt: '',
    positivePrompt: '',
    sampler: '',
    scheduler: '',
    seed: '',
    steps: '',
  };

  if (exif.parameters) {
    const automatic1111Meta = parseAutomatic1111Meta(exif.parameters);
    if (automatic1111Meta !== null) {
      metadata = automatic1111Meta;
    }
  } else if (exif.workflow) {
    metadata = parseComfyUiMeta(exif.workflow);
  } else if (exif.invokeai_metadata) {
    metadata = parseInvokeAIMeta(exif.invokeai_metadata);
  }

  return metadata;
};
