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
#!/bin/bash

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