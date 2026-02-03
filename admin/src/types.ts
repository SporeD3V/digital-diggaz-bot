export interface Config {
  GROUP_ID: string;
  FB_TOKEN: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_USER_ID: string;
  SPOTIFY_REFRESH_TOKEN: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}
