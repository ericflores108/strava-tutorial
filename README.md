# Create a backend app with CDK, Lambda, and DynamoDB

## Overview

I want to create a backend app that can be used to loop through my Strava users that are stored in a DDB table. The information I want to pull is their total miles ran and the goal they set for themselves in my frontend app. 

There will be two Lambda functions, one that will be triggered by a CloudWatch event, and the other will be triggered by an API Gateway endpoint. The CloudWatch event will be triggered every day at 12:00 AM, and will loop through the DDB table and pull the total miles ran for each user. If a user has met their goal, an email will be sent to them. The API Gateway endpoint will be triggered by a GET request, and will return the total miles ran for all users, and the total goal set for all users.

## Prerequisites

There are important principles I hope to demonstrate in this project. If you do things differently or have a better way of doing things, please let me know! I am still learning, and I am always open to new ideas.

  1. Error handling
  2. DRY (Don't Repeat Yourself) code - when to use it and when not to use it
  3. Clean code that is easy to read and understand. I will leverage TypeScript (types and comments) to help with this.

## Roadmap

1. Briefly discuss setting up code infrastructure and directories for the project (we will not focus on creating the infrastructure in this post)
2. Creating a Strava service in a "services" directory that will be used to pull data from the Strava API
3. Creating a DynamoDB service in a "services" directory that will be used to interact with the DDB table
4. Create a Lambda function that will be triggered by a CloudWatch event
5. Create a Lambda function that will be triggered by an API Gateway endpoint

## Project structure

The project structure will be as follows:

  * README.md
  * package.json
  * tsconfig.json
  * cdk.json
  * bin
    * backend-app.ts
  * lib
    * backend-app-stack.ts
  * src
    * services
      * strava
        * strava.service.ts
      * dynamodb
        * dynamodb.service.ts
    * api
      * get-total-miles.ts
    * scheduled-events
      * email-user-goal.ts
    * interfaces
      * user.ts
    * utils
      * log-functions.ts
    * index.ts

### Explanation of project structure

We will focus on the src directory, and the files within it. The src directory will contain all of our code. The services directory will contain all of our services. The api directory will contain all of our Lambda functions that will be triggered by an API Gateway endpoint. The scheduled-events directory will contain all of our Lambda functions that will be triggered by a CloudWatch event. The interfaces directory will contain all of our interfaces. The utils directory will contain all of our utility functions.

#### Important concepts from project structure

It's important to note that the project structure we've established will make our application more scalable and reusable. If we need to add more Lambda functions, we can easily do so by adding them to the appropriate directory. This will keep our code organized and easy to navigate as our application grows. Additionally, the Strava service we've created is a great example of DRY code in action. Since we don't need to repeat the same authentication code for every interaction with the Strava API, our code will be cleaner, more efficient, and easier to maintain. This is just one of the many benefits of using a structured approach to development.

I love bash to create directories and files, so I will use that to create the project structure. I will also use the touch command to create the files.

```bash
# Create the directory structure
mkdir -p src/{api,services,scheduled-events,interfaces,utils}
mkdir -p src/services/{strava,dynamodb}

# Create files in each directory
touch src/services/strava.ts
touch src/services/dynamodb.ts
touch src/api/get-total-miles.ts
touch src/scheduled-events/email-user-goal.ts
touch src/interfaces/user.ts
touch src/utils/log-functions.ts
touch src/index.ts

# Output success message
echo "Project directories created successfully."
```

## Creating a Strava service

We will create a Strava service in a "services" directory that will be used to pull data from the Strava API. The Strava service will be used to pull the total miles ran for a user.

Run the npm command to install axios and aws-sdk (we will use this to interact with AWS Secrets Manager, DynamoDB, SES, etc.).

```bash
npm install axios aws-sdk
```

### Authentication

First, we will create a "Strava" class that will be used in our Strava service. The class will contain a method that will be used to authenticate with the Strava API. We will use the axios library to make the request to the Strava API. We will use the aws-sdk library to interact with AWS Secrets Manager. We will use Secrets Manager to store our Strava client ID and client secret. We will use the Strava client ID and client secret to authenticate with the Strava API.

The User interface will be defined in the interfaces directory since this is an important interface that will be used throughout the application. The User interface will be used to store the athlete ID and access token for a user. The athlete ID and access token will be used to authenticate with the Strava API.
```typescript
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

```

As we move through many files, I find that creating JSDoc comments for each interface, method, etc. are extremely helpful when using the reusable code throughout the application. For instance, if we need to use the User interface in another file, we can easily reference the interface by looking at the comment. This will save us time and make our code more readable.

```typescript
import { SecretsManager } from "aws-sdk";
import axios from "axios";
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
}


```

The Strava class is then defined. It has several properties:

* axiosStrava: an instance of the Axios library, which is used to make requests to the Strava API.
* secretName: a string that represents the name of the secret stored in AWS Secrets Manager that contains the Strava API credentials.
* secrets: an object that will contain the client ID, client secret, refresh token, and grant type required to authenticate with the Strava API.
* accessToken: a string that represents the access token required to authenticate with the Strava API.
* athleteId: a number that represents the ID of the athlete whose data is being retrieved from the Strava API.

The constructor method is called when an instance of the Strava class is created. It takes two optional parameters - athleteId and accessToken - which can be used to set the athleteId and accessToken properties of the class.

The axiosStrava property is then initialized with an instance of Axios. The baseURL property is set to the URL for the athlete's data in the Strava API, with the athleteId property interpolated into the URL string. The Authorization header is also set with the accessToken.

### Error handling throughout the application

The Promise<[data, null] | [null, error]> return type used in the async functions in this code indicates that the function may either return a tuple containing the expected data and a null error value, or a tuple containing null data and an error object.

For example, the init() method returns a tuple containing the secrets object and a null error value if the getSecretValue() call succeeds, or a tuple containing null and the error object if an error occurs. This return type allows the calling code to easily check whether an error occurred during the execution of the function and handle it accordingly.

Using this type of return value can be useful in asynchronous functions where errors may occur during execution, as it provides a way to return both the expected data and an error object in a consistent format, making it easier for the calling code to handle errors in a predictable way.

We will be expanding on this error handling in the next section when we standardize this error handling as a method that can be implemented when calling different methods in the Strava class.

### Adding methods to the Strava class

Next, we will add methods to the Strava class to retrieve data from the Strava API. As mentioned above, for each method, we want to return a tuple containing the data and a null error value if the request succeeds, or a tuple containing null data and an error object if an error occurs. Since we will now only be returning the data from the Strava API base URL now that we are logged into the user, we can standardize the requests to the Strava API by creating a method that will make the request and return the data.

```typescript
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
```

#### Types and fetching data from the Strava API

As you may have noticed, the getUserStats() method returns a tuple containing an object with three properties, recent_run_totals, all_run_totals, and ytd_run_totals, and a null error value if the request succeeds, or a tuple containing null data and an error object if an error occurs. This is because the data returned from the Strava API is an object with three properties, recent_run_totals, all_run_totals, and ytd_run_totals, and we want to return the data in the same format that it is returned from the Strava API.

The fetchData() method is a protected method that is used to make requests to the Strava API. It takes a config object as a parameter, which is used to make the request to the Strava API. The config object contains the method, url, and data properties. The method property is used to specify the HTTP method to use, such as GET, POST, PUT, or DELETE. The url property is used to specify the URL to make the request to. The data property is used to specify the data to send with the request, such as the data to send when creating a new activity.

As some may warn, this method may be more verbose than necessary, but it is extremely useful and developer friendly when using the methods throughout the application. It allows us to easily add new methods to the Strava class and return the data in the same format that it is returned from the Strava API. It also allows us to easily add error handling to the methods in the Strava class.