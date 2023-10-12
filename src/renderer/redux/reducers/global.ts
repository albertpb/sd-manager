import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Model } from '../../../main/ipc/readdirModels';

export interface SettingsState {
  scanModelsOnStart: string | null;
  checkpointsPath: string | null;
  lorasPath: string | null;
  imagesPath: string | null;
  imagesDestPath: string | null;
}

interface GlobalState {
  initialized: boolean;
  checkpointsLoading: boolean;
  lorasLoading: boolean;
  settings: SettingsState;
  checkpoints: {
    filesInfo: Record<string, Model>;
  };
  loras: {
    filesInfo: Record<string, Model>;
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
  },
  checkpoints: {
    filesInfo: {},
  },
  loras: {
    filesInfo: {},
  },
  imagesLoading: false,
  imagesToDelete: {},
  navbarSearchInput: '',
};

const readDirModelsAsync = async (
  path: string,
  modelType: string
): Promise<Record<string, Model>> => {
  const filesHashMap = await window.ipcHandler.readdirModels(modelType, path);
  return filesHashMap;
};

export const readCheckpointsDir = createAsyncThunk(
  'readdir_checkpoints',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    if (state.global.settings.checkpointsPath !== null) {
      const files = await readDirModelsAsync(
        state.global.settings.checkpointsPath,
        'checkpoint'
      );

      return files;
    }
    return {};
  }
);

export const readLorasDir = createAsyncThunk(
  'readdir_loras',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    if (state.global.settings.lorasPath !== null) {
      const files = await readDirModelsAsync(
        state.global.settings.lorasPath,
        'lora'
      );
      return files;
    }
    return {};
  }
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
  }
);

export const deleteImages = createAsyncThunk(
  'deleteImages',
  async (arg, { getState }) => {
    const state = getState() as { global: GlobalState };

    await window.ipcHandler.deleteImages(state.global.imagesToDelete);
  }
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
  },
  extraReducers: (builder) => {
    builder.addCase(readCheckpointsDir.pending, (state) => {
      state.checkpointsLoading = true;
    });
    builder.addCase(readCheckpointsDir.fulfilled, (state, action) => {
      state.checkpoints.filesInfo = action.payload;
      state.checkpointsLoading = false;
    });

    builder.addCase(readLorasDir.pending, (state) => {
      state.lorasLoading = true;
    });
    builder.addCase(readLorasDir.fulfilled, (state, action) => {
      state.loras.filesInfo = action.payload;
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
  },
});

export const {
  setCheckpointsPath,
  setLorasPath,
  init,
  setImagesPath,
  setImagesDestPath,
  setNavbarSearchInputValue,
  setScanModelsOnStart,
  setImagesToDelete,
} = globalSlice.actions;
