import axios from 'axios';
import cheerio from 'cheerio';
// @ts-ignore
import yf from 'yahoo-finance';
// @ts-ignore
export const stonksFetch = async (ticker: string): Promise<string> => yf.quote({ symbol: ticker })
  .then(({ price }: { price: any }) => {
    const { regularMarketPrice, regularMarketChange, regularMarketChangePercent } = price || {};
    const percent = Math.round(regularMarketChangePercent * 100);
    const humanized = (regularMarketChange > 0 ? ':money_printer_brrr:' : ':burning-money:').repeat(Math.abs(percent));
    const plus = regularMarketChange > 0 ? '+' : '';
    const url = `https://finance.yahoo.com/quote/${price.symbol}`;

    return `<https://finance.yahoo.com/quote/${price.symbol}|${price.symbol}> ${regularMarketPrice} ${plus}${regularMarketChange.toFixed(2)} (${plus}${percent}%) ${humanized}`;
  });

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
  return `${definition} <${entry.permalink}|${entry.word}>`;
};

const wikiToSlack = (wiki: string) => wiki.replace(/( +)?===( +)?/g, '*').replace(/( +)?==( +)?/g, '_').slice(0, 2000);

export const wiktionaryFetch = async (str: string): Promise<string> => {
  const res = await axios.get(`https://en.wiktionary.org/w/api.php?action=query&prop=extracts&exlimit=1&format=json&exsentences=5&explaintext&titles=${str}`);
  const { data, status } = res;
  if (status >= 300) {
    throw new Error(`Bad status code from Wiktionary: ${res.status}`);
  }
  const pages = data?.query?.pages;
  const pageKey = Object.keys(pages)[0];
  if (parseInt(pageKey, 10) < 0) {
    throw new Error("No Wiktionary article.");
  }
  const page = pages[pageKey];
  const $ = cheerio.load(page?.extract);
  const extract = wikiToSlack($.root().text().trim());
  if (!extract) {
    throw new Error("Empty Wiktionary extract.");
  }
  const link = `https://en.Wiktionary.org/wiki/${page.title}`;
  return `${extract} <${link}|${page.title}>`;
};

export const wikipediaFetch = async (str: string): Promise<string> => {
  const res = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|categories&exlimit=1&format=json&exsentences=2&explaintext&titles=${str}`);
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
  const extract = wikiToSlack($.root().text().trim());
  if (!extract) {
    throw new Error("Empty Wikipedia extract.");
  }
  const link = `https://en.wikipedia.org/wiki/${page.title}`;
  return `${extract} <${link}|${page.title}>`;
};
