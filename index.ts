import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { handler } from './src/handler';

exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("does this work?");

  try {
    return await handler(event);
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: e.message,
        event,
      }),
    };
  }
};
