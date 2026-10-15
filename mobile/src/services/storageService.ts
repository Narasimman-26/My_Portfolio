import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'securechat_access_token';
const REFRESH_TOKEN_KEY = 'securechat_refresh_token';
const USER_KEY = 'securechat_current_user';
const BIOMETRICS_ENABLED_KEY = 'securechat_biometrics_enabled';
const SCREENSHOT_BLOCK_ENABLED_KEY = 'securechat_screenshot_block_enabled';

export class StorageService {
  static async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      if (SecureStore.isAvailableAsync && (await SecureStore.isAvailableAsync())) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        return;
      }
    } catch {
      // Fallback
    }
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      if (SecureStore.isAvailableAsync && (await SecureStore.isAvailableAsync())) {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (token) return token;
      }
    } catch {
      // Fallback
    }
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      if (SecureStore.isAvailableAsync && (await SecureStore.isAvailableAsync())) {
        const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (token) return token;
      }
    } catch {
      // Fallback
    }
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  static async clearTokens(): Promise<void> {
    try {
      if (SecureStore.isAvailableAsync && (await SecureStore.isAvailableAsync())) {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Ignore
    }
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  static async saveUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  static async getUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  static async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  }

  static async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(BIOMETRICS_ENABLED_KEY, JSON.stringify(enabled));
  }

  static async isBiometricsEnabled(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(BIOMETRICS_ENABLED_KEY);
    return raw !== null ? JSON.parse(raw) : true; // Default enabled
  }

  static async setScreenshotBlockEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(SCREENSHOT_BLOCK_ENABLED_KEY, JSON.stringify(enabled));
  }

  static async isScreenshotBlockEnabled(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(SCREENSHOT_BLOCK_ENABLED_KEY);
    return raw !== null ? JSON.parse(raw) : true; // Default enabled for security
  }
}
