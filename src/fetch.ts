import { request } from 'https';

import cheerio from 'cheerio';

export const urbanDictionaryFetch = async (str: string): Promise<string> => new Promise((a, r) => {
  const url = new URL(`https://api.urbandictionary.com/v0/define?term=${str}`);

  let data = "";
  const req = request(url, { method: "GET" }, res => {
    if (res.statusCode !== 200) {
      return r(`Bad status code from Urban Dictionary: ${res.statusCode}`);
    }
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      let body;
      try {
        body = JSON.parse(data);
      } catch (e) {
        return r(`Error parsing JSON from Urban Dictionary: ${e.message}`);
      }
      if (!body?.list?.length) {
        return r("No Urban Dictionary article.");
      }
      const entry = body.list[0];
      const msg = `Urban Dictionary says:\n${entry.definition} <${entry.permalink}|${entry.word}>`;
      return a(msg);
    });
  });
  req.on('error', e => {
    console.error(e.message);
    r(e.message);
  });
  req.end();
});

export const wikipediaFetch = async (str: string): Promise<string> => new Promise((a, r) => {
  const url = new URL(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro&exsentences=2&explaintext&titles=${str}`);

  let data = "";
  const req = request(url, { method: "GET" }, res => {
    if (res.statusCode !== 200) {
      return r(`Bad status code from Wikipedia: ${res.statusCode}`);
    }
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      let body;
      try {
        body = JSON.parse(data);
      } catch (e) {
        return r(`Error parsing JSON from Wikipedia: ${e.message}`);
      }
      const pages = body?.query?.pages;
      const pageKey = Object.keys(pages)[0];
      if (parseInt(pageKey, 10) < 0) {
        return r("No Wikipedia article.");
      }
      const page = pages[pageKey];
      const $ = cheerio.load(page?.extract);
      const extract = $.root().text().trim();
      if (!extract) {
        return r("Empty Wikipedia extract.");
      }
      const link = `https://en.wikipedia.org/wiki/${page.title}`;
      const msg = `Wikipedia says:\n${extract} <${link}|${page.title}>`;
      return a(msg);
    });
  });
  req.on('error', e => {
    console.error(e.message);
    r(e.message);
  });
  req.end();
});
