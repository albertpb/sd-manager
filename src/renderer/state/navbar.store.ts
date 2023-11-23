import { atomWithImmer } from 'jotai-immer';

export type NavbarState = {
  disabled: boolean;
  searchInput: string;
  filterCheckpoint: string;
};

export const navbarAtom = atomWithImmer<NavbarState>({
  disabled: false,
  searchInput: '',
  filterCheckpoint: '',
});
navbarAtom.debugLabel = 'navbarAtom';
