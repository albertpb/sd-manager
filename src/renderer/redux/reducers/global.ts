import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Model } from 'main/ipc/model';
import { ImageRow } from 'main/ipc/image';

export type SettingsState = {
  scanModelsOnStart: string | null;
  checkpointsPath: string | null;
  lorasPath: string | null;
  theme: string | null;
};

export type UpdateState = {
  needUpdate: boolean;
  loading: boolean;
};

export type ModelState = {
  models: Record<string, Model>;
  update: Record<string, UpdateState>;
  loading: boolean;
  checkingUpdates: boolean;
};

export type GlobalState = {
  initialized: boolean;
  navbarDisabled: boolean;
  settings: SettingsState;
  checkpoint: ModelState;
  lora: ModelState;
  images: ImageRow[];
  filterCheckpoint: string;
  imagesLoading: boolean;
  navbarSearchInput: string;
  imagesToDelete: Record<string, ImageRow>;
};

const initialState: GlobalState = {
  initialized: false,
  navbarDisabled: false,
  settings: {
    scanModelsOnStart: '0',
    checkpointsPath: null,
    lorasPath: null,
    theme: 'default',
  },
  checkpoint: {
    models: {},
    update: {},
    loading: false,
    checkingUpdates: false,
  },
  lora: {
    models: {},
    update: {},
    loading: false,
    checkingUpdates: false,
  },
  images: [],
  filterCheckpoint: '',
  imagesLoading: false,
  imagesToDelete: {},
  navbarSearchInput: '',
};

const readModelsAsync = async (
  modelType: string,
): Promise<Record<string, Model>> => {
  const filesHashMap = await window.ipcHandler.readModels(modelType);
  return filesHashMap;
};

export const readCheckpoints = createAsyncThunk(
  'read_checkpoints',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    if (state.global.settings.checkpointsPath !== null) {
      const models = await readModelsAsync('checkpoint');
      return models;
    }
    return {};
  },
);

export const readLoras = createAsyncThunk(
  'read_loras',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    if (state.global.settings.lorasPath !== null) {
      const models = await readModelsAsync('lora');
      return models;
    }
    return {};
  },
);

export const readImages = createAsyncThunk('read_images', async () => {
  return window.ipcHandler.getImages();
});

const loadSettingsAsync = async () => {
  const settings = await window.ipcHandler.settings('readAll');
  return settings;
};

export const loadSettings = createAsyncThunk('loadSettings', async () => {
  const response = await loadSettingsAsync();
  return response;
});

const saveSettings = async (key: string, value: any) => {
  await window.ipcHandler.settings('save', key, value);
};

export const scanImages = createAsyncThunk('scanImages', async () => {
  await window.ipcHandler.scanImages();
});

export const deleteImages = createAsyncThunk(
  'deleteImages',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    await window.ipcHandler.removeImages(state.global.imagesToDelete);
  },
);

export const updateModel = createAsyncThunk(
  'updateModel',
  async (arg: { hash: string; field: keyof Model; value: any }) => {
    await window.ipcHandler.updateModel(arg.hash, arg.field, arg.value);
    return arg;
  },
);

export const updateImage = createAsyncThunk(
  'updateImage',
  async (arg: { hash: string; field: keyof ImageRow; value: any }) => {
    await window.ipcHandler.updateImage(arg.hash, arg.field, arg.value);
    return arg;
  },
);

export const globalSlice = createSlice({
  name: 'Global',
  initialState,
  reducers: {
    setCheckpointsPath: (state, action) => {
      if (action.payload) {
        state.settings.checkpointsPath = action.payload;
        saveSettings('checkpointsPath', action.payload);
      }
    },
    setLorasPath: (state, action) => {
      if (action.payload) {
        state.settings.lorasPath = action.payload;
        saveSettings('lorasPath', action.payload);
      }
    },
    init: (state) => {
      state.initialized = true;
    },
    unInit: (state) => {
      state.initialized = false;
    },
    setScanModelsOnStart: (state, action) => {
      state.settings.scanModelsOnStart = action.payload;
      saveSettings('scanModelsOnStart', action.payload);
    },
    setNavbarSearchInputValue: (state, action) => {
      if (!state.navbarDisabled) {
        state.navbarSearchInput = action.payload;
      }
    },
    setImagesToDelete: (state, action) => {
      state.imagesToDelete = action.payload;
    },
    setTheme: (state, action) => {
      state.settings.theme = action.payload;
      saveSettings('theme', action.payload);
    },
    setFilterCheckpoint: (state, action) => {
      state.filterCheckpoint = action.payload;
    },
    setImages: (state, action) => {
      state.images = action.payload;
    },
    setNavbarDisabled: (state, action) => {
      state.navbarDisabled = action.payload;
    },
    setCheckingModelsUpdate: (
      state,
      action: {
        payload: { type: 'checkpoint' | 'lora'; updating: boolean };
        type: string;
      },
    ) => {
      state[action.payload.type].checkingUpdates = action.payload.updating;
    },
    clearModelsToUpdate: (
      state,
      action: {
        payload: { type: 'checkpoint' | 'lora' };
        type: string;
      },
    ) => {
      state[action.payload.type].update = {};
    },
    setModelsCheckingUpdate: (
      state,
      action: {
        payload: {
          type: 'checkpoint' | 'lora';
          modelId: number;
          loading: boolean;
        };
        type: string;
      },
    ) => {
      if (!state[action.payload.type].update[action.payload.modelId]) {
        state[action.payload.type].update[action.payload.modelId] = {
          loading: action.payload.loading,
          needUpdate: false,
        };
      } else {
        state[action.payload.type].update[action.payload.modelId].loading =
          action.payload.loading;
      }
    },
    setModelsToUpdate: (
      state,
      action: {
        payload: { type: 'checkpoint' | 'lora'; modelId: number };
        type: string;
      },
    ) => {
      if (!state[action.payload.type].update[action.payload.modelId]) {
        state[action.payload.type].update[action.payload.modelId] = {
          loading: false,
          needUpdate: true,
        };
      } else {
        state[action.payload.type].update[action.payload.modelId].needUpdate =
          true;
        state[action.payload.type].update[action.payload.modelId].loading =
          false;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(readCheckpoints.pending, (state) => {
      state.checkpoint.loading = true;
    });
    builder.addCase(readCheckpoints.fulfilled, (state, action) => {
      state.checkpoint.models = action.payload;
      state.checkpoint.loading = false;
    });

    builder.addCase(readLoras.pending, (state) => {
      state.lora.loading = true;
    });
    builder.addCase(readLoras.fulfilled, (state, action) => {
      state.lora.models = action.payload;
      state.lora.loading = false;
    });

    builder.addCase(readImages.fulfilled, (state, action) => {
      state.images = action.payload;
    });

    builder.addCase(loadSettings.fulfilled, (state, action) => {
      const payload: { key: string; value: string }[] | null = action.payload;
      if (payload) {
        state.settings = action.payload;
      }
    });

    builder.addCase(scanImages.pending, (state) => {
      state.imagesLoading = true;
    });
    builder.addCase(scanImages.fulfilled, (state) => {
      state.imagesLoading = false;
    });

    builder.addCase(deleteImages.pending, (state) => {
      state.imagesLoading = true;
    });
    builder.addCase(deleteImages.fulfilled, (state) => {
      state.imagesLoading = false;
      state.imagesToDelete = {};
    });

    builder.addCase(updateModel.fulfilled, (state, action) => {
      const checkpoint = state.checkpoint.models[action.payload.hash];
      if (checkpoint) {
        state.checkpoint.models[action.payload.hash] = {
          ...state.checkpoint.models[action.payload.hash],
          [action.payload.field]: action.payload.value,
        };
      }

      const lora = state.lora.models[action.payload.hash];
      if (lora) {
        state.lora.models[action.payload.hash] = {
          ...state.lora.models[action.payload.hash],
          [action.payload.field]: action.payload.value,
        };
      }
    });

    builder.addCase(updateImage.fulfilled, (state, action) => {
      const index = state.images.findIndex(
        (img) => img.hash === action.payload.hash,
      );
      if (index !== -1) {
        state.images[index] = {
          ...state.images[index],
          [action.payload.field]: action.payload.value,
        };
      }
    });
  },
});

export const {
  setCheckpointsPath,
  setLorasPath,
  init,
  unInit,
  setNavbarSearchInputValue,
  setScanModelsOnStart,
  setImagesToDelete,
  setTheme,
  setFilterCheckpoint,
  setImages,
  clearModelsToUpdate,
  setModelsCheckingUpdate,
  setModelsToUpdate,
  setCheckingModelsUpdate,
  setNavbarDisabled,
} = globalSlice.actions;
