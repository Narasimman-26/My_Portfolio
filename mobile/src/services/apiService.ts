import { StorageService } from './storageService';
import { DeepCheckResponse, UserProfile } from '@securechat/shared';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiService {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await StorageService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newAccessToken = await StorageService.getAccessToken();
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.data as T;
  }

  static async exchangeToken(payload: {
    idToken: string;
    username?: string;
    displayName?: string;
    publicKey: string;
  }): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string; expiresIn: number } }> {
    return this.request('/auth/token', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async refreshToken(): Promise<boolean> {
    const refreshToken = await StorageService.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.tokens) {
        await StorageService.saveTokens(
          data.data.tokens.accessToken,
          data.data.tokens.refreshToken
        );
        return true;
      }
    } catch {
      // Refresh failed
    }
    return false;
  }

  static async searchUsers(query: string): Promise<Partial<UserProfile>[]> {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }

  static async getUserProfile(uid: string): Promise<UserProfile> {
    return this.request(`/users/${uid}`);
  }

  static async checkSensitivity(text: string): Promise<DeepCheckResponse> {
    return this.request('/ai/check-sensitivity', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  static async blockUser(targetUid: string): Promise<{ success: boolean }> {
    return this.request('/users/block', {
      method: 'POST',
      body: JSON.stringify({ targetUid }),
    });
  }

  static async unblockUser(targetUid: string): Promise<{ success: boolean }> {
    return this.request(`/users/block/${targetUid}`, {
      method: 'DELETE',
    });
  }

  static async getBlockedUsers(): Promise<string[]> {
    return this.request('/users/blocked');
  }
}
