import { apiClient } from './client';
import type { User } from '@app-types/index';

export const userApi = {
    getProfile: (): Promise<{ user: User }> =>
        apiClient.get<{ user: User }>('/users/profile'),

    updateProfile: (data: { display_name?: string; avatar_url?: string }): Promise<{ user: User }> =>
        apiClient.patch<{ user: User }>('/users/profile', data),
};