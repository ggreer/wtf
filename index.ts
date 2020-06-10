import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const VERIFICATION_TOKEN: string | undefined = process.env.SLACK_VERIFICATION_TOKEN;
// const ACCESS_TOKEN: string = process.env.SLACK_ACCESS_TOKEN;

type Body = {
  type: string;
  challenge: string;
  token: string;
}

const isChallenge = (event: APIGatewayProxyEventV2, body: Body) => {
  if (event.requestContext.http.method !== "POST") {
    return false;
  }
  if (body.type !== "url_verification") {
    return false;
  }
  if (body.token !== VERIFICATION_TOKEN) {
    return false;
  }
  return true;
};

exports.handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const body: Body = JSON.parse(event.body ?? '');
  console.dir(event);
  console.dir(body);
  if (isChallenge(event, body)) {
    return {
      statusCode: 200,
      headers: { "content-type": "text/plain" },
      body: body?.challenge,
    };
  }
  const response = {
    statusCode: 200,
    body: JSON.stringify({ event, body }),
  };
  return response;
};
