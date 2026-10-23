/** Singleton state shared across all modules */
export const state = {
  plans:    [],
  reports:  [],
  queue:    [],
  settings: {
    gemma:          false,
    audio:          true,
    syncAuthorized: false,
  },
  draft:     null,
  imageData: null,
  audioBlob: null,
};
