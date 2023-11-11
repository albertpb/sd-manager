import { signal } from '@preact/signals-react';

export const checkpointsImportProgress = signal<{
  progress: number;
  message: string;
}>({
  progress: 0,
  message: '',
});

export const lorasImportProgress = signal<{
  progress: number;
  message: string;
}>({
  progress: 0,
  message: '',
});
