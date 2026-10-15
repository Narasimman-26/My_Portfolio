const mockStore = new Map<string, string>();

export const isAvailableAsync = async () => true;

export const setItemAsync = async (key: string, value: string) => {
  mockStore.set(key, value);
};

export const getItemAsync = async (key: string) => {
  return mockStore.get(key) || null;
};

export const deleteItemAsync = async (key: string) => {
  mockStore.delete(key);
};

export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
