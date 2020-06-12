import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';
import axios from 'axios';

import { getDefinition, findAcronym } from './acronyms';
import { VERIFICATION_TOKEN, OAUTH_ACCESS_TOKEN, SIGNING_SECRET } from './config';

type SlackElement = {
  type: string;
  user_id?: string;
  text?: string;
  elements?: SlackElement[];
};

type SlackBlock = {
  type: string;
  block_id: string;
  elements: SlackElement[];
}

type SlackEvent = {
  type: string;
  client_msg_id: string;
  text: string;
  user: string;
  ts: string;
  team: string;
  blocks: SlackBlock[];
  channel: string;
  event_ts: string;
  thread_ts: string;
}

type Body = {
  type: string;
  event_id: string;
  event_time: string;
  challenge: string;
  token: string;
  text: string;
  event: SlackEvent;
  authed_users: string[];
}


const verifySignature = (signature='', timestamp='', body='') => {
  const hmac = crypto.createHmac('sha256', SIGNING_SECRET);
  const [version, hash] = signature.split('=');
  hmac.update(`${version}:${timestamp}:${body}`);
  const a = Buffer.from(hash ?? '', 'hex');
  const b = hmac.digest();
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

const isChallenge = (event: APIGatewayProxyEvent, body: Body) => {
  if (event.requestContext.httpMethod !== 'POST') {
    return false;
  }
  if (body.type !== 'url_verification') {
    return false;
  }
  if (body.token !== VERIFICATION_TOKEN) {
    return false;
  }
  return true;
};

const reply = (event: SlackEvent, text: string) => axios.post("https://slack.com/api/chat.postMessage", {
  channel: event.channel,
  thread_ts: event.thread_ts,
  // TODO: add text field for notifications
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      }
    }
  ]
}, {
  headers: {
    Authorization: `Bearer ${OAUTH_ACCESS_TOKEN}`,
  }
});


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body: Body = JSON.parse(event.body ?? '{}');
  const signature = event.headers['X-Slack-Signature'];
  const timestamp = event.headers['X-Slack-Request-Timestamp'];

  // console.log(signature, timestamp);
  if (!verifySignature(signature, timestamp, event.body ?? '')) {
    return {
      statusCode: 401,
      body: 'Signature verification failed. You are not Slack!',
    };
  }

  if (isChallenge(event, body)) {
    return {
      statusCode: 200,
      headers: { 'content-type': 'text/plain' },
      body: body?.challenge,
    };
  }

  const slackEvent: SlackEvent = body.event;
  if (slackEvent.type !== 'app_mention') {
    console.log(JSON.stringify(body));
    // Don't care.
    return {
      statusCode: 204,
      body: '',
    };
  }

  const chunks = slackEvent.blocks
    .filter(b => b.type === 'rich_text')
    .reduce((accum: string[], b: SlackBlock) => {
      const text: string[] = [];
      b.elements.map(element => element.elements?.filter(e => e.type === 'text').forEach(e => e.text && text.push(e.text)));
      return text;
    }, []);
  const string = chunks.join(' ').trim();

  const acronym = findAcronym(string);
  console.log(acronym);

  const definition = await getDefinition(acronym);
  console.log('definition', definition);

  try {
    const res = await reply(slackEvent, definition);
    console.log(JSON.stringify(res.data));
  } catch (e) {
    console.error(e);
  }

  // Send a 204 so Slack doesn't get angry at us
  return {
    statusCode: 204,
    body: '',
  };
};
