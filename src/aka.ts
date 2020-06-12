import axios from 'axios';
import cheerio from 'cheerio';
import AWS from 'aws-sdk';

import { ATLASSIAN_API_TOKEN, ATLASSIAN_USERNAME, CONFLUENCE_HOST, S3_BUCKET } from './config';

export type acronym = {
  acronym: string;
  link?: string;
  oktaOnly: boolean;
  text: string | (() => string);
};

export type acronyms = Record<string, acronym[]>;

const s3 = new AWS.S3();
const auth = {
  username: ATLASSIAN_USERNAME,
  password: ATLASSIAN_API_TOKEN,
};


export const refresh = async () => {
  const res = await axios.get(`https://${CONFLUENCE_HOST}/wiki/rest/api/content/229815001/history/`, { auth });
  const version = res.data.lastUpdated.number;
  console.log(version);
  const { data } = await axios.get(`https://${CONFLUENCE_HOST}/wiki/rest/api/content/229815001/history/${version}/macro/id/44764e27-edd0-4d3c-9769-7353d080e6eb`, { auth });
  const $ = cheerio.load(data.body);
  const acronyms: acronyms = {};
  $('table > tbody').find('tr').each((i, tr) => {
    const tds = $(tr).find('td');
    if (!tds.length) {
      return;
    }
    const acronym = $(tds.get(0)).text();
    const valueElem = $(tds).get(1);
    const value = {
      acronym,
      text: $(valueElem).text(),
      link: $(valueElem).find('a').attr('href'),
      oktaOnly: $(tds.get(2)).find('img').length > 0,
    };
    if (!tds.length) {
      return;
    }
    const key = acronym.toLowerCase();
    if (!acronyms[key]) {
      acronyms[key] = [value];
    } else {
      acronyms[key].push(value);
    }
  });

  console.log("PUTTING");
  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: 'table.json',
    Body: JSON.stringify(acronyms),
    ContentType: "application/json",
    Metadata: {
      version: version.toString(),
    }
  }).promise();

  return { acronyms, version };
};

export const get = async (acronyms: Record<string, acronym[]>): Promise<acronyms> => {
  console.log("GETTING");
  const data = await s3.getObject({
    Bucket: S3_BUCKET,
    Key: 'table.json',
  }).promise();

  const obj = JSON.parse(data?.Body?.toString('utf8') ?? '{}');

  return { ...obj, ...acronyms };
};

// get({}).then(a => console.dir(a));
