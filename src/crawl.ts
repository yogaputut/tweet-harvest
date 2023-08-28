import { ElementHandle } from "@playwright/test";
import * as fs from "fs";
import dayjs from "dayjs";
import { pick } from "lodash";
import chalk from "chalk";
import path from "path";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

const NOW = dayjs().format("DD-MM-YYYY HH-mm-ss");

const filteredFields = [
  "created_at",
  "id_str",
  "full_text",
  "quote_count",
  "reply_count",
  "retweet_count",
  "favorite_count",
  "lang",
  "user_id_str",
  "conversation_id_str",
  "username",
  "tweet_url",
  "coordinates"
];

function appendCsv(pathStr: string, contents: any) {
  const dirName = path.dirname(pathStr);
  const fileName = path.resolve(pathStr);

  fs.mkdirSync(dirName, { recursive: true });
  fs.appendFileSync(fileName, contents);

  return fileName;
}

async function scrollAndSave(page, FILE_NAME) {
  const tweets = await page.$$('<tweet_selector>'); // Gantikan <tweet_selector> dengan selector CSS sebenarnya
  
  const tweetContents = await Promise.all(tweets.map(async (tweet: ElementHandle) => {
    const tweetContent = await tweet.$eval('<tweet_content_selector>', el => el.textContent); // Gantikan <tweet_content_selector>
    const userContent = await tweet.$eval('<user_content_selector>', el => el.textContent); // Gantikan <user_content_selector>
    const coordinates = await tweet.$eval('<coordinates_selector>', el => el.textContent); // Gantikan <coordinates_selector>

    return {
      tweet: tweetContent,
      user: userContent,
      coordinates: coordinates
    };
  }));

  const rows = tweetContents.map((current) => {
    const tweet = pick(current.tweet, filteredFields);
    tweet["coordinates"] = current.coordinates;
    return tweet;
  });

  // Tambahkan ke CSV
  appendCsv(FILE_NAME, JSON.stringify(rows));
}

export async function crawl({
  ACCESS_TOKEN,
  SEARCH_KEYWORDS,
  SEARCH_FROM_DATE,
  SEARCH_TO_DATE,
  TARGET_TWEET_COUNT = 10,
  DELAY_EACH_TWEET_SECONDS = 3,
  DEBUG_MODE,
  OUTPUT_FILENAME,
}: {
  ACCESS_TOKEN: string;
  SEARCH_KEYWORDS: string;
  SEARCH_FROM_DATE?: string;
  SEARCH_TO_DATE?: string;
  TARGET_TWEET_COUNT?: number;
  DELAY_EACH_TWEET_SECONDS?: number;
  DEBUG_MODE?: boolean;
  OUTPUT_FILENAME?: string;
}) {
  const FOLDER_DESTINATION = "./tweets-data";
  const filename = (OUTPUT_FILENAME || `${SEARCH_KEYWORDS} ${NOW}`).trim().replace(".csv", "");
  const FILE_NAME = `${FOLDER_DESTINATION}/${filename}.csv`.replace(/ /g, "_").replace(/:/g, "-");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    screen: { width: 1240, height: 1080 },
    storageState: {
      cookies: [
        {
          name: "auth_token",
          value: ACCESS_TOKEN,
          domain: "twitter.com",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
        },
      ],
      origins: [],
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60 * 1000);

  await page.goto("https://twitter.com/search-advanced?f=live"); // Gantikan dengan URL pencarian Twitter yang sesuai

  await scrollAndSave(page, FILE_NAME);

  if (!DEBUG_MODE) {
    await browser.close();
  }
}
