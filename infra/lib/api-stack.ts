import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigatewayAuthorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const handler = new nodejs.NodejsFunction(this, "ApiHandler", {
      functionName: "oscars-2026-api",
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../../api/src/index.ts"),
      handler: "handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      environment: {
        TABLE_NAME: props.table.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
      },
      bundling: {
        format: nodejs.OutputFormat.ESM,
        mainFields: ["module", "main"],
        minify: true,
        sourceMap: true,
      },
    });

    props.table.grantReadWriteData(handler);

    const authorizer = new apigatewayAuthorizers.HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      {
        jwtAudience: [props.userPoolClient.userPoolClientId],
      }
    );

    const httpApi = new apigateway.HttpApi(this, "OscarsApi", {
      apiName: "oscars-2026-api",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.PATCH,
          apigateway.CorsHttpMethod.DELETE,
        ],
        allowHeaders: ["Authorization", "Content-Type"],
      },
    });

    const integration = new apigatewayIntegrations.HttpLambdaIntegration(
      "LambdaIntegration",
      handler
    );

    httpApi.addRoutes({
      path: "/api/{proxy+}",
      methods: [
        apigateway.HttpMethod.GET,
        apigateway.HttpMethod.POST,
        apigateway.HttpMethod.PUT,
        apigateway.HttpMethod.PATCH,
        apigateway.HttpMethod.DELETE,
      ],
      integration,
      authorizer,
    });

    // Public routes (no auth required)
    httpApi.addRoutes({
      path: "/api/health",
      methods: [apigateway.HttpMethod.GET],
      integration,
    });

    this.apiUrl = httpApi.apiEndpoint;

    new cdk.CfnOutput(this, "ApiUrl", { value: this.apiUrl });
  }
}
