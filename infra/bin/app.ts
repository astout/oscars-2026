#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DataStack } from "../lib/data-stack";
import { AuthStack } from "../lib/auth-stack";
import { ApiStack } from "../lib/api-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const env = {
  account: "134502660579",
  region: "us-east-1",
};

const data = new DataStack(app, "Oscars2026Data", { env });
const auth = new AuthStack(app, "Oscars2026Auth", { env });

const api = new ApiStack(app, "Oscars2026Api", {
  env,
  table: data.table,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
});

new FrontendStack(app, "Oscars2026Frontend", {
  env,
  apiUrl: api.apiUrl,
});
