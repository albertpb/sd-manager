import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export type CheckpointItem = {
  hash: string;
  modelPath: string;
  fileName: string;
};

export type LoraItem = {
  hash: string;
  modelPath: string;
  fileName: string;
};

export interface SettingsState {
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
    filesInfo: Record<string, CheckpointItem>;
  };
  loras: {
    filesInfo: Record<string, LoraItem>;
  };
  imagesLoading: boolean;
  images: {
    filesInfo: Record<string, any>;
  };
  navbarSearchInput: string;
}

const initialState: GlobalState = {
  initialized: false,
  checkpointsLoading: false,
  lorasLoading: false,
  settings: {
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
  images: {
    filesInfo: {},
  },
  navbarSearchInput: '',
};

const readDirModelsAsync = async (
  path: string,
  modelType: string
): Promise<Record<string, CheckpointItem>> => {
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
        'checkpoints'
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
        'loras'
      );
      return files;
    }
    return {};
  }
);

const loadSettingsAsync = async () => {
  const settings = await window.ipcHandler.storage('read', 'settings');
  return settings;
};

export const loadSettings = createAsyncThunk('loadSettings', async () => {
  const response = await loadSettingsAsync();
  return response;
});

const saveSettings = async (state: GlobalState) => {
  await window.ipcHandler.storage('save', 'settings', {
    ...state.settings,
  });
};

export const organizeImages = createAsyncThunk('organizeImages', async () => {
  await window.ipcHandler.organizeImages();
});

export const globalSlice = createSlice({
  name: 'Global',
  initialState,
  reducers: {
    setCheckpointsPath: (state, action) => {
      state.settings.checkpointsPath = action.payload;
      saveSettings(state);
    },
    setLorasPath: (state, action) => {
      state.settings.lorasPath = action.payload;
      saveSettings(state);
    },
    init: (state) => {
      state.initialized = true;
    },
    setImagesPath: (state, action) => {
      state.settings.imagesPath = action.payload;
      saveSettings(state);
    },
    setImagesDestPath: (state, action) => {
      state.settings.imagesDestPath = action.payload;
      saveSettings(state);
    },
    setNavbarSearchInputValue: (state, action) => {
      state.navbarSearchInput = action.payload;
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
      if (action.payload) {
        state.settings = action.payload as SettingsState;
      }
    });

    builder.addCase(organizeImages.pending, (state) => {
      state.imagesLoading = true;
    });
    builder.addCase(organizeImages.fulfilled, (state) => {
      state.imagesLoading = false;
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
} = globalSlice.actions;
