export const invokeaiPrompts = [
  `{"app_version": "3.3.0post3", "generation_mode": "txt2img", "positive_prompt": "landscape", "negative_prompt": "low quality", "width": 768, "height": 432, "seed": 356120443, "rand_device": "cpu", "cfg_scale": 7.5, "steps": 50, "scheduler": "dpmpp_2m_sde_k", "clip_skip": 0, "model": {"model_name": "amixx_3Prunedfp16", "base_model": "sd-1", "model_type": "main"}, "controlnets": [], "ipAdapters": [], "t2iAdapters": [], "loras": [], "vae": {"model_name": "sd-vae-ft-mse", "base_model": "sd-1"}}`,

  `{"app_version": "3.3.0post3", "generation_mode": "txt2img", "positive_prompt": "", "negative_prompt": "low quality", "width": 768, "height": 432, "seed": 3400881859, "rand_device": "cpu", "cfg_scale": 7.5, "steps": 50, "scheduler": "dpmpp_2m_sde_k", "clip_skip": 0, "model": {"model_name": "amixx_3Prunedfp16", "base_model": "sd-1", "model_type": "main"}, "controlnets": [], "ipAdapters": [], "t2iAdapters": [], "loras": [], "vae": {"model_name": "sd-vae-ft-mse", "base_model": "sd-1"}}`,

  `{"app_version": "3.3.0post3", "generation_mode": "txt2img", "positive_prompt": "", "negative_prompt": "", "width": 768, "height": 432, "seed": 2361668801, "rand_device": "cpu", "cfg_scale": 7.5, "steps": 50, "scheduler": "dpmpp_2m_sde_k", "clip_skip": 0, "model": {"model_name": "amixx_3Prunedfp16", "base_model": "sd-1", "model_type": "main"}, "controlnets": [], "ipAdapters": [], "t2iAdapters": [], "loras": [], "vae": {"model_name": "sd-vae-ft-mse", "base_model": "sd-1"}}`,
];

export const invokeaiMetas = [
  {
    positivePrompt: 'landscape',
    negativePrompt: 'low quality',
    cfg: '7.5',
    seed: '356120443',
    steps: '50',
    model: 'amixx_3Prunedfp16',
    sampler: 'dpmpp_2m_sde_k',
    scheduler: 'dpmpp_2m_sde_k',
    generatedBy: 'InvokeAI',
  },

  {
    positivePrompt: '',
    negativePrompt: 'low quality',
    cfg: '7.5',
    seed: '3400881859',
    steps: '50',
    model: 'amixx_3Prunedfp16',
    sampler: 'dpmpp_2m_sde_k',
    scheduler: 'dpmpp_2m_sde_k',
    generatedBy: 'InvokeAI',
  },

  {
    positivePrompt: '',
    negativePrompt: '',
    cfg: '7.5',
    seed: '2361668801',
    steps: '50',
    model: 'amixx_3Prunedfp16',
    sampler: 'dpmpp_2m_sde_k',
    scheduler: 'dpmpp_2m_sde_k',
    generatedBy: 'InvokeAI',
  },
];
