import axios from 'axios';
import cheerio from 'cheerio';

export const urbanDictionaryFetch = async (str: string): Promise<string> => {
  const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${str}`);
  if (res.status >= 300) {
    throw new Error(`Bad status code from Urban Dictionary: ${res.status}`);
  }
  const body = res.data;
  if (!body?.list?.length) {
    throw new Error("No Urban Dictionary article.");
  }
  const entry = body.list[0];
  const definition = entry.definition.split('\n')[0];
  return `Urban Dictionary says:\n${definition} <${entry.permalink}|${entry.word}>`;
};

// urbanDictionaryFetch("wtf").then(t => console.log(t));

export const wikipediaFetch = async (str: string): Promise<string> => {
  const res = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro&exsentences=2&explaintext&titles=${str}`);
  const { data, status } = res;
  if (status >= 300) {
    throw new Error(`Bad status code from Wikipedia: ${res.status}`);
  }
  const pages = data?.query?.pages;
  const pageKey = Object.keys(pages)[0];
  if (parseInt(pageKey, 10) < 0) {
    throw new Error("No Wikipedia article.");
  }
  const page = pages[pageKey];
  const $ = cheerio.load(page?.extract);
  const extract = $.root().text().trim();
  if (!extract) {
    throw new Error("Empty Wikipedia extract.");
  }
  const link = `https://en.wikipedia.org/wiki/${page.title}`;
  return `Wikipedia says:\n${extract} <${link}|${page.title}>`;
};
