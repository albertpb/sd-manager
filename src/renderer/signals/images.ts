import { signal } from '@preact/signals-react';
import { ImageRow } from 'main/ipc/image';

export const imagesImportProgress = signal<{
  progress: number;
  message: string;
}>({
  progress: 0,
  message: '',
});

export const imagesToDelete = signal<Record<string, ImageRow>>({});
