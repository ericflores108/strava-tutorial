import { SecretsManager } from "aws-sdk";
import axios, { Method } from "axios";
import { User } from "../interfaces/user";

interface Secrets {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  grant_type: string;
}

/**
 * Strava API client that interacts with the Strava API using Axios.
 */
export class Strava {
  axiosStrava: any;
  secretName: string = "strava";
  secrets: Secrets;
  user: User;

  /**
   * Creates a new instance of the Strava class.
   * @constructor
   * @param {number} [athleteId] - The Strava athlete ID to retrieve data for.
   * @param {string} [accessToken] - The Strava access token to use for authentication.
   */
  constructor(athleteId?: number, accessToken?: string) {
    if (athleteId && accessToken) {
      this.user.athleteId = athleteId;
      this.user.accessToken = accessToken;
    }

    this.axiosStrava = axios.create({
      baseURL: `https://www.strava.com/api/v3/athletes/${this.user.athleteId}`,
      headers: {
        Authorization: `Bearer ${this.user.accessToken}`,
      },
    });
  }

  /**
   * Initializes the Strava client by retrieving the Strava API credentials from AWS Secrets Manager.
   * @async
   * @returns {Promise<[Secrets | null, any]>} - A promise that resolves to an array containing the Strava API credentials or an error object.
   */
  async init(): Promise<[Secrets | null, any]> {
    const secretsManager = new SecretsManager();
    try {
      const secretData = await secretsManager
        .getSecretValue({ SecretId: this.secretName })
        .promise();

      if (!secretData.SecretString) return [null, "No secret string"];
      this.secrets = JSON.parse(secretData.SecretString);
      return [this.secrets, null];
    } catch (error) {
      return [null, error];
    }
  }

  /**
   * Logs in a user by exchanging a refresh token for an access token.
   * @async
   * @param {string} refreshToken - The user's Strava refresh token.
   * @returns {Promise<[User | null, any]>} - A promise that resolves to an array containing the user's data or an error object.
   */
  async loginUser(refreshToken: string): Promise<[User | null, any]> {
    const config = {
      method: "post",
      url: `https://www.strava.com/oauth/token?client_id=${this.secrets.client_id}&client_secret=${this.secrets.client_secret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
    };
    try {
      const response = await axios(config);
      this.user = response.data;
      return [this.user, null];
    } catch (error) {
      return [null, error];
    }
  }

  /**
   * Get user stats from Strava.
   * @async
   * @returns {Promise<[{ recent_run_totals: number | null; all_run_totals: number | null; ytd_run_totals: number | null; } | null, any]>} - A promise that resolves to an array containing the user's stats or an error object.
   * @example
   * const [data, error] = await this.getUserStats();
   * if (error) {
   *   console.log(error);
   * }
   * console.log(data);
   * { "recent_run_totals" : "", "all_run_totals" : "", "ytd_run_totals" : "" }
   */
  async getUserStats(): Promise<
    [
      {
        recent_run_totals: number | null;
        all_run_totals: number | null;
        ytd_run_totals: number | null;
      } | null,
      any
    ]
  > {
    const config = {
      method: "get" as Method,
      url: "/stats",
    };
    return await this.fetchData(config);
  }

  /**
   * fetch data from Strava using axios
   * @param config
   * @returns
   * @example
   * const [data, error] = await this.fetchData(config);
   * if (error) {
   *    console.log(error);
   * }
   * console.log(data);
   *
   */
  protected async fetchData(config: {
    method: Method;
    url: string;
    data?: any;
  }): Promise<[any, any]> {
    try {
      const response = await this.axiosStrava(config);
      return [response.data, null];
    } catch (error: any) {
      if (error.response) {
        return [null, error.response.data];
      } else if (error.request) {
        // The request was made but no response was received
        return [null, "No response received from the server."];
      } else {
        // Something happened in setting up the request that triggered an Error
        return [null, error.message];
      }
    }
  }
}
