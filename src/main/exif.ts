import { splitOutsideQuotes } from './util';

export type ImageMetaData = {
  positivePrompt: string;
  negativePrompt: string;
  sampler: string;
  steps: string;
  seed: string;
  cfg: string;
  generatedBy: string;
  model: string;
  scheduler: string;
};

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
        offset + length + 8
      );

      // Store the metadata in the object
      metadata[keyword] = textData;
    }

    // Move to the next chunk
    offset += length + 12;
  }

  return metadata;
}

export function parseAutomatic1111Meta(
  parameters: string
): ImageMetaData | null {
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

    const params: ImageMetaData = {
      positivePrompt,
      negativePrompt,
      cfg: data.CFG_scale,
      seed: data.Seed,
      steps: data.Steps,
      model: data.Model,
      sampler: data.Sampler,
      scheduler: data.Scheduler,
      generatedBy: 'automatic1111',
    };

    return params;
  }
  return null;
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
      (node: Record<string, any>) => node.type === 'KSamplerAdvanced'
    );

    if (KSamplerNode) {
      params.seed = KSamplerNode.widgets_values[1];
      params.cfg = KSamplerNode.widgets_values[4];
      params.steps = KSamplerNode.widgets_values[3];
      params.scheduler = `${KSamplerNode.widgets_values[6]}`;
      params.sampler = `${KSamplerNode.widgets_values[5]}`;
    } else {
      KSamplerNode = parsed.nodes.find(
        (node: Record<string, any>) => node.type === 'KSampler'
      );

      if (KSamplerNode) {
        params.seed = KSamplerNode.widgets_values[0];
        params.cfg = KSamplerNode.widgets_values[3];
        params.steps = KSamplerNode.widgets_values[2];
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
            ''
          );
        }
      }
    }
  }
  return params;
}

export const parseImageSdMeta = (exif: Record<string, any>) => {
  let metadata: ImageMetaData | null = null;
  if (exif.parameters) {
    metadata = parseAutomatic1111Meta(exif.parameters);
  } else if (exif.workflow) {
    metadata = parseComfyUiMeta(exif.workflow);
  }

  return metadata;
};
