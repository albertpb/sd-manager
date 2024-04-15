// worker.js

const fs = require('fs');
const { parentPort } = require('worker_threads');

function extractMetadata(pngData) {
  try {
    const metadata = {};

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
  } catch (error) {
    console.log(error);
    return {};
  }
}

function splitOutsideQuotes(input) {
  const regex = /([ 0-9a-zA-Z]+: "[^"]+")/g;
  const parts = input.match(regex);
  let arr = [];
  if (parts !== null) {
    arr = arr.concat(parts.map((part) => part.trim()));
  }
  const cleanTxt = input
    .replace(regex, '')
    .split(',')
    .reduce((acc, part) => {
      const p = part.trim();
      if (p !== '') acc.push(p);
      return acc;
    }, []);
  return arr.concat(cleanTxt);
}

function parseAutomatic1111Meta(parameters) {
  const matches = parameters.match(/^(.*?)(Negative prompt:.*?)?(Steps:.*)/s);

  const params = {
    positivePrompt: '',
    negativePrompt: '',
    cfg: '',
    seed: '',
    steps: '',
    model: '',
    sampler: '',
    scheduler: '',
    generatedBy: 'automatic1111',
  };

  if (matches) {
    const firstString = matches[1]?.trim() || '';
    const secondString =
      matches[2]?.replace('Negative prompt:', '').trim() || '';
    const thirdString = matches[3]?.trim() || '';

    const keyValuePairs = splitOutsideQuotes(thirdString);

    const data = keyValuePairs.reduce((acc, pair) => {
      const [key, value] = pair.split(': ');
      acc[key.replace(' ', '_')] = value;
      return acc;
    }, {});

    params.positivePrompt = firstString;
    params.negativePrompt = secondString;
    params.cfg = data.CFG_scale;
    params.seed = data.Seed;
    params.steps = data.Steps;
    params.model = data.Model;
    params.sampler = data.Sampler;
    params.scheduler = data.Sampler;
  }

  return params;
}

function parseComfyUiMeta(workflow) {
  const params = {
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

  try {
    const parsed = JSON.parse(workflow);

    if (parsed.nodes && Array.isArray(parsed.nodes)) {
      let KSamplerNode = parsed.nodes.find(
        (node) => node.type === 'KSamplerAdvanced',
      );

      if (KSamplerNode) {
        params.seed = `${KSamplerNode.widgets_values[1]}`;
        params.cfg = `${KSamplerNode.widgets_values[4]}`;
        params.steps = `${KSamplerNode.widgets_values[3]}`;
        params.scheduler = `${KSamplerNode.widgets_values[6]}`;
        params.sampler = `${KSamplerNode.widgets_values[5]}`;
      } else {
        KSamplerNode = parsed.nodes.find((node) => node.type === 'KSampler');

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
          const node = parsed.nodes[i];

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
  } catch (error) {
    console.error(error);
    return params;
  }
}

const parseInvokeAIMeta = (invokeaiMetadata) => {
  try {
    const parsed = JSON.parse(invokeaiMetadata);

    const params = {
      positivePrompt: parsed.positive_prompt || '',
      negativePrompt: parsed.negative_prompt || '',
      cfg: `${parsed.cfg_scale || ''}`,
      seed: `${parsed.seed || ''}`,
      steps: `${parsed.steps || ''}`,
      model: parsed.model.model_name || '',
      sampler: parsed.scheduler || '',
      scheduler: parsed.scheduler || '',
      generatedBy: 'InvokeAI',
    };

    return params;
  } catch (error) {
    console.error(error);
    return {
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
  }
};

const parseImageSdMeta = (exif) => {
  let metadata = {
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

function parseImage(filePath) {
  const file = fs.readFileSync(filePath);
  const exif = extractMetadata(file);
  const metadata = parseImageSdMeta(exif);
  parentPort.postMessage({ type: 'result', message: { [filePath]: metadata } });
}

// Listen for messages from the main thread
parentPort.on('message', async (filePath) => {
  parseImage(filePath);
});
