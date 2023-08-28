import { ElementHandle } from "@playwright/test";
import * as fs from "fs";
import dayjs from "dayjs";
import { pick } from "lodash";
import chalk from "chalk";
import path from "path";
import { TweetResponseData } from "./types/response-tweet";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { inputKeywords } from "./features/input-keywords";
import { listenNetworkRequests } from "./features/listen-network-requests";

chromium.use(stealth());

const NOW = dayjs().format("DD-MM-YYYY HH-mm-ss");
let headerWritten = false;

function appendCsv(pathStr: string, contents: any, cb?) {
  const dirName = path.dirname(pathStr);
  const fileName = path.resolve(pathStr);

  fs.mkdirSync(dirName, { recursive: true });
  fs.appendFileSync(fileName, contents, cb);

  return fileName;
}

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
  "coordinates" // Ditambahkan
];

type StartCrawlTwitterParams = {
  twitterSearchUrl?: string;
};


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
  let MODIFIED_SEARCH_KEYWORDS = SEARCH_KEYWORDS;

  const CURRENT_PACKAGE_VERSION = require("../package.json").version;

  const FOLDER_DESTINATION = "./tweets-data";
  const FUlL_PATH_FOLDER_DESTINATION = path.resolve(FOLDER_DESTINATION);
  const filename = (OUTPUT_FILENAME || `${SEARCH_KEYWORDS} ${NOW}`).trim().replace(".csv", "");

  const FILE_NAME = `${FOLDER_DESTINATION}/${filename}.csv`.replace(/ /g, "_").replace(/:/g, "-");

  console.info(chalk.blue("\nOpening twitter search page...\n"));

  if (fs.existsSync(FILE_NAME)) {
    console.info(
      chalk.blue(`\nFound existing file ${FILE_NAME}, renaming to ${FILE_NAME.replace(".csv", ".old.csv")}`)
    );
    fs.renameSync(FILE_NAME, FILE_NAME.replace(".csv", ".old.csv"));
  }

  let TWEETS_NOT_FOUND_ON_LIVE_TAB = false;

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

  listenNetworkRequests(page);

  async function startCrawlTwitter({
    twitterSearchUrl = "https://twitter.com/search-advanced?f=live",
  }: StartCrawlTwitterParams = {}) {
    await page.goto(twitterSearchUrl);

    

    async function scrollAndSave() {
      

      const tweetContents = tweets
        .map((tweet) => {
          
          return {
            tweet: tweetContent,
            user: userContent,
            coordinates: tweetContent.coordinates // Ditambahkan
          };
        })
        .filter((tweet) => tweet !== null);

      

      const rows = comingTweets.reduce((prev: [], current: (typeof tweetContents)[0]) => {
        const tweet = pick(current.tweet, filteredFields);

        

        tweet["coordinates"] = current.coordinates; // Ditambahkan

        

      }, []);

      
    }

    await scrollAndSave();

    if (allData.tweets.length) {
      console.info(`Already got ${allData.tweets.length} tweets, done scrolling...`);
    } else {
      console.info("No tweets found for the search criteria");
    }
  }

  try {
    await startCrawlTwitter();

    if (TWEETS_NOT_FOUND_ON_LIVE_TAB && (SEARCH_FROM_DATE || SEARCH_TO_DATE)) {
      console.info('No tweets found on "Latest" tab, trying "Top" tab...');

      await startCrawlTwitter({
        twitterSearchUrl: "https://twitter.com/search-advanced",
      });
    }
  } catch (error) {
    console.error(error);
    console.info(chalk.blue(`Keywords: ${MODIFIED_SEARCH_KEYWORDS}`));
    console.info(chalk.yellowBright("Twitter Harvest v", CURRENT_PACKAGE_VERSION));

    const errorFilename = FUlL_PATH_FOLDER_DESTINATION + `/Error-${NOW}.png`.replace(/ /g, "_").replace(".csv", "");

    await page.screenshot({ path: path.resolve(errorFilename) }).then(() => {
      console.log(
        chalk.red(
          `\nIf you need help, please send this error screenshot to the maintainer, it was saved to "${path.resolve(
            errorFilename
          )}"`
        )
      );
    });
  } finally {
    if (!DEBUG_MODE) {
      await browser.close();
    }
  }
}


