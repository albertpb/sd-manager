import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Model } from 'main/ipc/model';

export interface SettingsState {
  scanModelsOnStart: string | null;
  checkpointsPath: string | null;
  lorasPath: string | null;
  imagesPath: string | null;
  imagesDestPath: string | null;
  theme: string | null;
}

interface GlobalState {
  initialized: boolean;
  checkpointsLoading: boolean;
  lorasLoading: boolean;
  settings: SettingsState;
  checkpoints: {
    models: Record<string, Model>;
  };
  loras: {
    models: Record<string, Model>;
  };
  imagesLoading: boolean;
  navbarSearchInput: string;
  imagesToDelete: Record<string, boolean>;
}

const initialState: GlobalState = {
  initialized: false,
  checkpointsLoading: false,
  lorasLoading: false,
  settings: {
    scanModelsOnStart: '0',
    checkpointsPath: null,
    lorasPath: null,
    imagesPath: null,
    imagesDestPath: null,
    theme: 'default',
  },
  checkpoints: {
    models: {},
  },
  loras: {
    models: {},
  },
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

export const organizeImages = createAsyncThunk(
  'organizeImages',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    if (
      state.global.settings.imagesPath &&
      state.global.settings.imagesDestPath
    ) {
      await window.ipcHandler.organizeImages();
    }
  },
);

export const deleteImages = createAsyncThunk(
  'deleteImages',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    await window.ipcHandler.deleteImages(state.global.imagesToDelete);
  },
);

export const updateModel = createAsyncThunk(
  'updateModel',
  async (arg: { hash: string; field: keyof Model; value: any }) => {
    await window.ipcHandler.updateModel(arg.hash, arg.field, arg.value);
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
    setImagesPath: (state, action) => {
      if (action.payload) {
        state.settings.imagesPath = action.payload;
        saveSettings('imagesPath', action.payload);
      }
    },
    setImagesDestPath: (state, action) => {
      if (action.payload) {
        state.settings.imagesDestPath = action.payload;
        saveSettings('imagesDestPath', action.payload);
      }
    },
    setScanModelsOnStart: (state, action) => {
      state.settings.scanModelsOnStart = action.payload;
      saveSettings('scanModelsOnStart', action.payload);
    },
    setNavbarSearchInputValue: (state, action) => {
      state.navbarSearchInput = action.payload;
    },
    setImagesToDelete: (state, action) => {
      state.imagesToDelete = action.payload;
    },
    setTheme: (state, action) => {
      state.settings.theme = action.payload;
      saveSettings('theme', action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(readCheckpoints.pending, (state) => {
      state.checkpointsLoading = true;
    });
    builder.addCase(readCheckpoints.fulfilled, (state, action) => {
      state.checkpoints.models = action.payload;
      state.checkpointsLoading = false;
    });

    builder.addCase(readLoras.pending, (state) => {
      state.lorasLoading = true;
    });
    builder.addCase(readLoras.fulfilled, (state, action) => {
      state.loras.models = action.payload;
      state.lorasLoading = false;
    });

    builder.addCase(loadSettings.fulfilled, (state, action) => {
      const payload: { key: string; value: string }[] | null = action.payload;
      if (payload) {
        state.settings = action.payload;
      }
    });

    builder.addCase(organizeImages.pending, (state) => {
      state.imagesLoading = true;
    });
    builder.addCase(organizeImages.fulfilled, (state) => {
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
      const checkpoint = state.checkpoints.models[action.payload.hash];
      if (checkpoint) {
        state.checkpoints.models[action.payload.hash] = {
          ...state.checkpoints.models[action.payload.hash],
          [action.payload.field]: action.payload.value,
        };
      }

      const lora = state.loras.models[action.payload.hash];
      if (lora) {
        state.loras.models[action.payload.hash] = {
          ...state.loras.models[action.payload.hash],
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
  setImagesPath,
  setImagesDestPath,
  setNavbarSearchInputValue,
  setScanModelsOnStart,
  setImagesToDelete,
  setTheme,
} = globalSlice.actions;
