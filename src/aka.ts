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

const auth = {
  username: ATLASSIAN_USERNAME,
  password: ATLASSIAN_API_TOKEN,
};

const EXPAND_ALL = 'expand=body.storage,version,webresource.superbatch.uris.css,webresource.superbatch.uris.js,webresource.tags.all,webresource.uris.css,webresource.uris.js';

const expandData = (pageID: number, value: string) => axios.post(`https://${CONFLUENCE_HOST}/wiki/rest/api/contentbody/convert/view?${EXPAND_ALL}&_r=${Date.now()}`,
  { value: value, content: { id: pageID }, representation: "storage" }, { auth });

type confluenceData = { acronyms: acronyms; version: number};

const refreshAnarchy = async (): Promise<confluenceData> => {
  const ANARCHY_PAGE_ID = 1108724556;
  const res = await axios.get(`https://${CONFLUENCE_HOST}/wiki/rest/api/content/${ANARCHY_PAGE_ID}?expand=body.storage,version`, { auth });
  const version = res.data.version.number;
  console.log(version);

  const { data: expandedData } = await expandData(ANARCHY_PAGE_ID, res.data.body.storage.value);
  const $ = cheerio.load(expandedData.value);
  const acronyms: acronyms = {};
  $('table > tbody').find('tr').each((i, tr) => {
    const tds = $(tr).find('td');
    if (!tds.length) {
      return;
    }
    const acronym = $(tds.get(0)).text();
    const text = $(tds.get(1)).text();
    let link = $(tds.get(1)).find('a').attr('href');
    if (link?.startsWith('/')) {
      link = `https://${CONFLUENCE_HOST}${link}`;
    }
    const value = {
      acronym,
      text,
      link,
      oktaOnly: true,
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

  return { acronyms, version };
};


const refreshWTHDTAM = async (): Promise<confluenceData> => {
  const WTHDTAM_PAGE_ID = 229815001;

  const res = await axios.get(`https://${CONFLUENCE_HOST}/wiki/rest/api/content/${WTHDTAM_PAGE_ID}/history/`, { auth });
  const version = res.data.lastUpdated.number;
  const { data: unexpandedData } = await axios.get(`https://${CONFLUENCE_HOST}/wiki/rest/api/content/${WTHDTAM_PAGE_ID}/history/${version}/macro/id/16ae930d-8e1e-41f2-94c6-0d75d04c8328`, { auth });

  const { data: expandedData } = await expandData(WTHDTAM_PAGE_ID, unexpandedData.body);

  const $ = cheerio.load(expandedData.value);
  const acronyms: acronyms = {};
  $('table > tbody').find('tr').each((i, tr) => {
    const tds = $(tr).find('td');
    if (!tds.length) {
      return;
    }
    const acronym = $(tds.get(0)).text();
    const text = $(tds.get(1)).text();
    let link = $(tds.get(1)).find('a').attr('href');
    if (link?.startsWith('/')) {
      link = `https://${CONFLUENCE_HOST}${link}`;
    }
    const value = {
      acronym,
      text,
      link,
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

  return { acronyms, version };
};

const s3 = new AWS.S3();

export const refresh = async () => {
  console.log("REFRESHING");

  const [wthdtam, anarchy] = await Promise.all([refreshWTHDTAM(), refreshAnarchy()]);
  const acronyms = { ...anarchy.acronyms, ...wthdtam.acronyms };

  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: 'table.json',
    Body: JSON.stringify(acronyms),
    ContentType: "application/json",
    Metadata: {
      version: wthdtam.version.toString(),
    }
  }).promise();
  return { acronyms, version: wthdtam.version };
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
