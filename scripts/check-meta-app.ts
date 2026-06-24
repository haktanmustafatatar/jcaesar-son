import dotenv from "dotenv";
dotenv.config();

async function main() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("META_APP_ID or META_APP_SECRET is missing in .env!");
    process.exit(1);
  }

  console.log("--- Checking Meta App Configuration ---");
  console.log(`App ID: ${appId}`);

  // Concatenate appId and appSecret to get App Access Token
  const appAccessToken = `${appId}|${appSecret}`;

  try {
    // 1. Get App details
    console.log("\nFetching App details...");
    const appUrl = `https://graph.facebook.com/v22.0/${appId}?access_token=${appAccessToken}`;
    const appRes = await fetch(appUrl);
    const appData = await appRes.json();
    console.log(JSON.stringify(appData, null, 2));

    // 2. Get Webhook Subscriptions
    console.log("\nFetching Webhook Subscriptions...");
    const subUrl = `https://graph.facebook.com/v22.0/${appId}/subscriptions?access_token=${appAccessToken}`;
    const subRes = await fetch(subUrl);
    const subData = await subRes.json();
    console.log(JSON.stringify(subData, null, 2));

  } catch (err: any) {
    console.error("Error checking Meta App:", err.message);
  }
}

main();
