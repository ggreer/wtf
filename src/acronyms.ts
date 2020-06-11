import cheerio from 'cheerio';

import { html } from './html';

type Acronym = {
  acronym: string;
  link?: string;
  oktaOnly: boolean;
  text: string;
}

const acronyms: Record<string, Acronym[]> = {};

const $ = cheerio.load(html);
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

const mrkdwnLink = ({ acronym, link, text, oktaOnly }: Acronym) => {
  let msg;
  if (link) {
    msg = `${acronym}: <${link}|${text}>`;
  } else {
    msg = `${acronym}: ${text}`;
  }
  if (oktaOnly) {
    msg += ' (Okta only)';
  }
  return msg;
};

export const getDefinition = (str: string): string => {
  const key = str.toLowerCase();
  if (!acronyms[key]) {
    return `No definition found for ${str}`;
  }
  return acronyms[key].map(mrkdwnLink).join('\n');
};

export const findAcronym = (str: string): string => {
  const re = new RegExp(/(is\s+)?(?<acronym>\w+)\??/, 'ig');
  const matches = re.exec(str);
  const acronym = matches?.groups?.acronym;
  if (acronym) {
    return acronym;
  }
  return str;
};
