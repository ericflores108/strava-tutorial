/**
 * User interface
 * @interface
 * @property {string} accessToken - Strava access token
 * @property {string} refreshToken - Strava refresh token
 * @property {number} expiresAt - Strava access token expiration time
 * @property {number} athleteId - Strava athlete id
 * @property {number} goal - User goal
 */
export interface User {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId?: number;
  goal?: number;
}
