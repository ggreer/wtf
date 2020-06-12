import cheerio from 'cheerio';
import levenshtein from 'fast-levenshtein';

import { html } from './html';
import { urbanDictionaryFetch, wikipediaFetch, wiktionaryFetch } from './fetch';

type Acronym = {
  acronym: string;
  link?: string;
  oktaOnly: boolean;
  text: string | (() => string);
}

const acronyms: Record<string, Acronym[]> = {
  life: [{
    acronym: 'life',
    oktaOnly: false,
    text: 'I don\'t know. Ask Samer.',
  }],
  taha: [{
    acronym: 'Taha',
    oktaOnly: false,
    text: 'Taha Teke is the GOAT!',
  }],
  lafuta: [{
    acronym: 'LAFUTA',
    oktaOnly: false,
    text: 'Light a fire under that ass!',
  }],
  lars: [{
    acronym: 'Lars',
    oktaOnly: false,
    text: () => Math.random() > 0.5
      ? ':larsipoo:'
      : 'a :poop: from :flag-no:',
  }],
  "samer's favorite champagne": [{
    acronym: "Samer's favorite champagne",
    oktaOnly: false,
    text: 'Veuve Clicquot',
  }],
  liverpool: [{
    acronym: "Liverpool",
    oktaOnly: false,
    text: () => Math.random() > 0.5
      ? 'Liverpool\'s last league title was in 1990.'
      : 'The best Football club in the world!',
  }],
  wtf: [{
    acronym: "WTF",
    oktaOnly: false,
    text: 'World Taekwondo Federation',
    link: 'https://github.com/ggreer/wtf',
  }],
};

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
  text = typeof text === 'function' ? text() : text;
  if (link) {
    msg = `*${acronym}*: <${link}|${text}>`;
  } else {
    msg = `*${acronym}*: ${text}`;
  }
  if (oktaOnly) {
    msg += ' _(Okta only)_';
  }
  return msg;
};

const findClosest = (needle: string): string[] => {
  let closest: string[] = [];
  let lowScore = Infinity;
  Object.keys(acronyms).forEach(k => {
    const score = levenshtein.get(k, needle);
    if (score > lowScore) {
      return;
    }
    if (score < lowScore) {
      lowScore = score;
      closest = [k];
      return;
    }
    closest.push(k);
  });

  return lowScore <= needle.length / 3
    ? closest.slice(0, 10)
    : [];
};

const formatResponse = (authority: string, msg: string) => `_${authority}_ says:\n${msg}`;

const help = `Find out things. Usage:
\`@wtf [query]\`
@wtf searches <https://oktawiki.atlassian.net/wiki/spaces/DOC/pages/229815001/WTHDTAM+AKA+That+Acronym+List|WTHDTAM+AKA+That+Acronym+List> and falls back to Wikipedia, then Wiktionary if it can't find anything.
\`@wtf random\` gets a random acronym.
\`@wtf urban [query]\` searches Urban Dictionary (be careful!)`;

export const getDefinition = async (str: string): Promise<string> => {
  const key = str.toLowerCase();

  if (key === 'help') {
    return help;
  }

  if (key === 'random' || key === 'rand') {
    const keys = Object.keys(acronyms);
    return getDefinition(keys[Math.floor(keys.length * Math.random())]);
  }

  const re = new RegExp(/(urban\s+)(?<urbanStr>[^?]+)\??/, 'g');
  const matches = re.exec(str);
  const urbanStr = matches?.groups?.urbanStr;
  if (urbanStr) {
    try {
      const r = await urbanDictionaryFetch(urbanStr);
      return formatResponse("Urban Dictionary", r);
    } catch (e) {
      console.error(e.message);
      return `No Urban Dictionary entry found for ${str}`;
    }
  }

  if (!acronyms[key]) {
    const maybes = findClosest(key);
    if (maybes.length) {
      const expanded = maybes.map(m => acronyms[m].map(mrkdwnLink)).join('\n');
      return `¿Did you mean?\n${expanded}`;
    }

    try {
      const wiki = await wikipediaFetch(str);
      return formatResponse('Wikipedia', wiki);
    } catch (e) {
      console.error(e.message);
    }

    try {
      const wiki = await wiktionaryFetch(str);
      return formatResponse('Wiktionary', wiki);
    } catch (e) {
      console.error(e.message);
    }

    return `No definition found for ${str}`;
  }
  return formatResponse('Okta', acronyms[key].map(mrkdwnLink).join('\n'));
};

export const findAcronym = (str: string): string => {
  const re = new RegExp(/(is\s+)?(?<acronym>[^?]+)\??/, 'ig');
  const matches = re.exec(str);
  const acronym = matches?.groups?.acronym;
  if (acronym) {
    return acronym;
  }
  return str;
};
