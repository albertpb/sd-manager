import { createId } from '@paralleldrive/cuid2';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Model } from 'main/ipc/model';
import { ImageRow } from 'main/ipc/image';
import { WatchFolder } from 'main/ipc/watchFolders';
import { Tag } from 'main/ipc/tag';
import { getTextColorFromBackgroundColor } from 'renderer/utils';

export type SettingsState = {
  scanModelsOnStart: string | null;
  scanImagesOnStart: string | null;
  checkpointsPath: string | null;
  lorasPath: string | null;
  theme: string | null;
  activeTag: string | null;
  autoImportImages: string | null;
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
  navbarDisabled: boolean;
  settings: SettingsState;
  checkpoint: ModelState;
  lora: ModelState;
  images: ImageRow[];
  filterCheckpoint: string;
  imagesLoading: boolean;
  navbarSearchInput: string;
  imagesToDelete: Record<string, ImageRow>;
  watchFolders: WatchFolder[];
  tags: Tag[];
};

const initialState: GlobalState = {
  navbarDisabled: false,
  settings: {
    scanModelsOnStart: '0',
    scanImagesOnStart: '0',
    checkpointsPath: null,
    lorasPath: null,
    theme: 'default',
    activeTag: null,
    autoImportImages: '0',
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
  watchFolders: [],
  tags: [],
};

const readModelsAsync = async (
  modelType: string,
): Promise<Record<string, Model>> => {
  const filesHashMap = await window.ipcHandler.readModels(modelType);
  return filesHashMap;
};

export const readCheckpoints = createAsyncThunk(
  'read_checkpoints',
  async ({ shouldImport }: { shouldImport: boolean }, { getState }) => {
    const state = getState() as { global: GlobalState };
    if (state.global.settings.checkpointsPath !== null) {
      if (shouldImport) {
        await window.ipcHandler.readdirModels(
          'checkpoint',
          state.global.settings.checkpointsPath,
        );
      }
      const models = await readModelsAsync('checkpoint');
      return models;
    }
    return {};
  },
);

export const readLoras = createAsyncThunk(
  'read_loras',
  async ({ shouldImport }: { shouldImport: boolean }, { getState }) => {
    const state = getState() as { global: GlobalState };

    if (state.global.settings.lorasPath !== null) {
      if (shouldImport) {
        await window.ipcHandler.readdirModels(
          'lora',
          state.global.settings.lorasPath,
        );
      }

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

export const scanImages = createAsyncThunk(
  'scanImages',
  async (paths: string[]) => {
    await window.ipcHandler.scanImages(paths);
  },
);

export const deleteImages = createAsyncThunk(
  'deleteImages',
  async (arg, { getState, dispatch }) => {
    const state = getState() as { global: GlobalState };

    await window.ipcHandler.removeImages(state.global.imagesToDelete);
    await dispatch(readImages());
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

export const loadWatchFolders = createAsyncThunk(
  'loadWatchFolders',
  async () => {
    const watchFolders = await window.ipcHandler.watchFolder('read');
    return watchFolders;
  },
);

export const loadTags = createAsyncThunk('loadTags', async () => {
  const tags = await window.ipcHandler.tag('read');
  return tags;
});

export const createTag = createAsyncThunk(
  'createTag',
  async ({ label, bgColor }: { label: string; bgColor: string }) => {
    const payload = {
      id: createId(),
      label,
      color: getTextColorFromBackgroundColor(bgColor),
      bgColor,
    };
    await window.ipcHandler.tag('add', payload);
    return payload;
  },
);

export const deleteTag = createAsyncThunk('deleteTag', async (arg: string) => {
  await window.ipcHandler.tag('delete', { id: arg });
  return arg;
});

export const editTag = createAsyncThunk(
  'editTag',
  async ({
    label,
    bgColor,
    id,
  }: {
    label: string;
    bgColor: string;
    id: string;
  }) => {
    const payload = {
      label,
      bgColor,
      color: getTextColorFromBackgroundColor(bgColor),
      id,
    };
    await window.ipcHandler.tag('edit', payload);
    return payload;
  },
);

export const tagImage = createAsyncThunk(
  'tagImage',
  async ({ tagId, imageHash }: { tagId: string; imageHash: string }) => {
    await window.ipcHandler.tagImage(tagId, imageHash);
    return { tagId, imageHash };
  },
);

export const regenerateThumbnails = createAsyncThunk(
  'regenerateThumbnails',
  async () => {
    await window.ipcHandler.regenerateThumbnails();
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
    setScanModelsOnStart: (state, action) => {
      state.settings.scanModelsOnStart = action.payload;
      saveSettings('scanModelsOnStart', action.payload);
    },
    setScanImagesOnStart: (state, action) => {
      state.settings.scanImagesOnStart = action.payload;
      saveSettings('scanImagesOnStart', action.payload);
    },
    setAutoImportImages: (state, action) => {
      state.settings.autoImportImages = action.payload;
      saveSettings('autoImportImages', action.payload);
      // reload listener
      window.ipcHandler.watchImagesFolder();
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
    setActiveTag: (state, action) => {
      state.settings.activeTag = action.payload;
      saveSettings('activeTag', action.payload);
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

    builder.addCase(loadWatchFolders.fulfilled, (state, action) => {
      state.watchFolders = action.payload;
    });

    builder.addCase(loadTags.fulfilled, (state, action) => {
      state.tags = action.payload;
    });

    builder.addCase(createTag.fulfilled, (state, action) => {
      state.tags.push(action.payload);
      state.settings.activeTag = action.payload.id;
    });

    builder.addCase(deleteTag.fulfilled, (state, action) => {
      const index = state.tags.findIndex((tag) => tag.id === action.payload);
      if (index !== -1) {
        state.tags.splice(index, 1);
      }
      if (state.settings.activeTag === action.payload) {
        if (state.tags.length > 0) {
          state.settings.activeTag = state.tags[state.tags.length - 1].id;
        }
      }
    });

    builder.addCase(editTag.fulfilled, (state, action) => {
      const index = state.tags.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tags[index] = action.payload;
      }
    });

    builder.addCase(tagImage.fulfilled, (state, action) => {
      const image = state.images.find(
        (img) => img.hash === action.payload.imageHash,
      );
      if (image) {
        if (image.tags[action.payload.tagId]) {
          const tags = { ...image.tags };
          delete tags[action.payload.tagId];
          image.tags = tags;
        } else {
          image.tags[action.payload.tagId] = action.payload.tagId;
        }
      }
    });

    builder.addCase(regenerateThumbnails.pending, (state) => {
      state.imagesLoading = true;
    });

    builder.addCase(regenerateThumbnails.fulfilled, (state) => {
      state.imagesLoading = false;
    });
  },
});

export const {
  setCheckpointsPath,
  setLorasPath,
  setNavbarSearchInputValue,
  setScanModelsOnStart,
  setScanImagesOnStart,
  setImagesToDelete,
  setTheme,
  setFilterCheckpoint,
  setImages,
  clearModelsToUpdate,
  setModelsCheckingUpdate,
  setModelsToUpdate,
  setCheckingModelsUpdate,
  setNavbarDisabled,
  setActiveTag,
  setAutoImportImages,
} = globalSlice.actions;
