import levenshtein from 'fast-levenshtein';

import { acronym as acronymType, acronyms as acronymsType, get } from './aka';
import { urbanDictionaryFetch, wikipediaFetch, wiktionaryFetch, stonksFetch } from './fetch';

const initialAcronyms: acronymsType = {
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
  life: [{
    acronym: 'life',
    oktaOnly: false,
    text: 'I don\'t know. Ask Samer.',
  }],
  liverpool: [{
    acronym: "Liverpool",
    oktaOnly: false,
    text: () => Math.random() > 0.5
      ? 'Liverpool\'s last league title was in 1990.'
      : 'The best Football club in the world!',
  }],
  lstfu: [{
    acronym: 'LSTFU',
    oktaOnly: true,
    text: 'Oh.. yeah... about that. Ask :hans:',
  }],
  "samer's favorite champagne": [{
    acronym: "Samer's favorite champagne",
    oktaOnly: false,
    text: 'Veuve Clicquot',
  }],
  taha: [{
    acronym: 'Taha',
    oktaOnly: false,
    text: 'Taha Teke is the GOAT!',
  }],
  wtf: [{
    acronym: "WTF",
    oktaOnly: false,
    text: 'World Taekwondo Federation',
    link: 'https://github.com/ggreer/wtf',
  }],
};

const mrkdwnLink = ({ acronym, link, text, oktaOnly }: acronymType) => {
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

const findClosest = (acronyms: acronymsType, needle: string): string[] => {
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

const help = `Find out things.
Usage:
\`@wtf [query]\`
@wtf searches <https://oktawiki.atlassian.net/wiki/spaces/DOC/pages/229815001/WTHDTAM+AKA+That+Acronym+List|WTHDTAM+AKA+That+Acronym+List> and falls back to <https://oktawiki.atlassian.net/wiki/spaces/~424152769/pages/1108724556/WTF+Bot+Data|WTF Bot Data>, then Wikipedia, then Wiktionary.
\`@wtf random\` gets a random acronym.
\`@wtf $[ticker]\` searches Yahoo Finance
\`@wtf stonks [ticker]\` searches Yahoo Finance
\`@wtf urban [query]\` searches Urban Dictionary (be careful!)
\`@wtf wikipedia [query]\` searches Wikipedia
\`@wtf wiktionary [query]\` searches Wiktionary
Don't forget to <https://okta.circlehd.com/view/WTF-A-Slack-Bot-For-Acronyms-1bg5sQLwoO|Vote for WTF> in the Hackathon!`;


const runCommand = async (authority: string, fetcher: (args: string) => Promise<string>, args: string) => {
  try {
    return formatResponse(authority, await fetcher(args));
  } catch (e) {
    console.log(e.message);
    return `No ${authority} entry found for ${args}`;
  }
};

export const getDefinition = async (str: string): Promise<string> => {
  const key = str.toLowerCase();

  if (key === 'help') {
    return help;
  }

  const acronyms = await get(initialAcronyms);

  if (key === 'random' || key === 'rand') {
    const keys = Object.keys(acronyms);
    return getDefinition(keys[Math.floor(keys.length * Math.random())]);
  }

  const re = new RegExp(/(\$(?<stonk>[\w-]+$))|(^(?<command>\w+)\s+)(?<args>[^?]+)\??/, 'g');
  const matches = re.exec(str);
  const { command, args, stonk } = matches?.groups || {};
  if (stonk) {
    return runCommand('Yahoo Finance', stonksFetch, stonk);
  }
  switch (command) {
    case 'urban':
      return runCommand("Urban Dictionary", urbanDictionaryFetch, args);
    case 'stonks':
      return runCommand('Yahoo Finance', stonksFetch, args);
    case 'wikipedia':
      return runCommand("Wikipedia", wikipediaFetch, args);
    case 'wiktionary':
      return runCommand('Wiktionary', wiktionaryFetch, args);
  }

  if (!acronyms[key]) {
    const maybes = findClosest(acronyms, key);
    if (maybes.length) {
      const expanded = maybes.map(m => acronyms[m].map(mrkdwnLink)).join('\n');
      return `¿Did you mean?\n${expanded}`;
    }

    try {
      const wiki = await wikipediaFetch(str);
      return formatResponse('Wikipedia', wiki);
    } catch (e) {
      console.log(e.message);
    }

    try {
      const wiki = await wiktionaryFetch(str);
      return formatResponse('Wiktionary', wiki);
    } catch (e) {
      console.log(e.message);
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
