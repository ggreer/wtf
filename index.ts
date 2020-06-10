import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { handler } from './src/handler';

exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    return await handler(event);
  } catch (e) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: e.message,
        event,
      }),
    };
  }
};
