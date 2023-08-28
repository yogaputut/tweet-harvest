import * as fs from "fs";
import dayjs from "dayjs";
import { pick } from "lodash";
import chalk from "chalk";
import path from "path";
import { Entry } from "./types/tweets.types";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { inputKeywords } from "./features/input-keywords";
import { listenNetworkRequests } from "./features/listen-network-requests";
import { HEADLESS_MODE } from "./env";

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

// Tambahkan 'coordinates' ke filteredFields
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
  "coordinates"  // Baris baru
];

type StartCrawlTwitterParams = {
  twitterSearchUrl?: string;
};

export async function crawl({
  ACCESS_TOKEN,
  SEARCH_KEYWORDS,
  TWEET_THREAD_URL,
  SEARCH_FROM_DATE,
  SEARCH_TO_DATE,
  TARGET_TWEET_COUNT = 10,
  DELAY_EACH_TWEET_SECONDS = 3,
  DEBUG_MODE,
  OUTPUT_FILENAME,
}: {
  ACCESS_TOKEN: string;
  SEARCH_KEYWORDS?: string;
  SEARCH_FROM_DATE?: string;
  SEARCH_TO_DATE?: string;
  TARGET_TWEET_COUNT?: number;
  DELAY_EACH_TWEET_SECONDS?: number;
  DEBUG_MODE?: boolean;
  OUTPUT_FILENAME?: string;
  TWEET_THREAD_URL?: string;
}) {
  // ... (kode sebelumnya)

  async function scrollAndSave() {
    // ... (kode sebelumnya)

    const tweetContents = tweets
      .map((tweet) => {
        // ... (kode sebelumnya)

        return {
          tweet: tweetContent,
          user: userContent,
          // Baris baru untuk mengekstraksi koordinat
          coordinates: tweetContent.coordinates || null,
        };
      })
      .filter((tweet) => tweet !== null);

    // ... (kode sebelumnya)

    // Tambahkan 'coordinates' ke headerRow
    const headerRow = filteredFields.join(";") + "\n";

    // ... (kode sebelumnya)

    const rows = comingTweets.reduce((prev: [], current: (typeof tweetContents)[0]) => {
      const tweet = pick(current.tweet, filteredFields);

      // ... (kode sebelumnya)

      // Baris baru untuk menambahkan koordinat ke CSV
      tweet["coordinates"] = current.coordinates ? JSON.stringify(current.coordinates) : "N/A";

      const row = Object.values(tweet).join(";");

      return [...prev, row];
    }, []);

    const csv = (rows as []).join("\n") + "\n";
          const fullPathFilename = appendCsv(FILE_NAME, csv);

          console.info(chalk.blue(`Your tweets saved to: ${fullPathFilename}`));

          // progress:
          console.info(chalk.yellow(`Total tweets saved: ${allData.tweets.length}`));
          additionalTweetsCount += comingTweets.length;

          // for every multiple of 100, wait for 5 seconds
          if (additionalTweetsCount > 100) {
            additionalTweetsCount = 0;
            console.info(chalk.gray("\n--Taking a break, waiting for 10 seconds..."));
            await page.waitForTimeout(10_000);
          } else if (additionalTweetsCount > 20) {
            await page.waitForTimeout(DELAY_EACH_TWEET_SECONDS * 1000);
          }
        } else {
          timeoutCount++;
          console.info(chalk.gray("Scrolling more..."));

          if (timeoutCount > TIMEOUT_LIMIT) {
            console.info(chalk.yellow("No more tweets found, please check your search criteria and csv file result"));
            break;
          }

          await page.evaluate(() =>
            window.scrollTo({
              behavior: "smooth",
              top: 10_000 * 9_000,
            })
          );

          await scrollAndSave(); // call the function again to resume scrolling
        }

        await page.evaluate(() =>
          window.scrollTo({
            behavior: "smooth",
            top: 10_000 * 9_000,
          })
        );
      }
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
