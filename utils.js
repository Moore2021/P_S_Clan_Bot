import 'dotenv/config';
import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import { getPlayerStats, getClanStats, getPlayerStatsLife } from './PUBGapiCalls.js'
import {getSteamGroup} from './STEAMapiCalls.js'

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf, encoding) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/Moore2021/P_S_Clan_Bot, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export function markdownFilter(raw) {
  if (raw.includes(`_`)) raw = raw.replace(/_/g, `\\_`);
  if (raw.includes(`*`)) raw = raw.replace(/[*]/g, `\\*`);
  if (raw.includes(`\``)) raw = raw.replace(/`/g, "\\`");
  if (raw.includes(`>`)) raw = raw.replace(/>/g, `\\>`);
  if (raw.includes(`|`)) raw = raw.replace(/[|]/g, `\\|`);
  return raw;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}`;
  const guildEnpoint = false ? `/guilds/597171669550759936` : '';
  const wholeEndpoint = endpoint + guildEnpoint + `/commands`
  const resetCommands = false ? [] : commands
  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(wholeEndpoint, { method: 'PUT', body: resetCommands });
  } catch (err) {
    console.error(err);
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭', '😄', '😌', '🤓', '😎', '😤', '🤖', '😶‍🌫️', '🌏', '📸', '💿', '👋', '🌊', '✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// "https://api.pubg.com/shards/$platform/players?filter[playerNames]=$playername"
export async function getPlayerStatsPUBG(username, platform, gamemode) {
  return await getPlayerStats(username, platform, gamemode)
}

export async function getClanStatsPUBG() {
  const PUBG_Clan_details = await getClanStats()
  const STEAM_GROUP = await getSteamGroup()
  const embed = {
    "type": "rich",
    "title": `PoP-Smoke`,
    "description": `The Pop Smoke Gaming Community, was created and founded by Zen (Also Known as Zenless). est. 2022\n[Discord invite](${process.env.DISCORD_INVITE})\n[Steam Group](https://steamcommunity.com/groups/PSmoke)`,
    "color": 0x00FFFF,
    "fields": [
      {
        "name": `Clan Tag`,
        "value": PUBG_Clan_details.clanTag,
        "inline": true
      },
      {
        "name": `Clan Level`,
        "value": `${PUBG_Clan_details.clanLevel}`,
        "inline": true
      },
      {
        "name": `Clan Member Count`,
        "value": `${PUBG_Clan_details.clanMemberCount}`,
        "inline": true
      },
      {        
        "name": `Steam Member Count`,
        "value": `${STEAM_GROUP.memberCount}`,
        "inline": false
      }
    ],
    "thumbnail": {
      "url": `https://media.discordapp.net/attachments/1168703085321932861/1168774202724208661/BANNER.png?ex=6552fccc&is=654087cc&hm=9c8ed20675d803b27363fb855ded92cc2ee6eea348a946b85d377469dd3e9c9c&=`,
      "height": 0,
      "width": 0
    },
    "author": {
      "name": "Owner: Zen"
    },
    "footer": {
      "text": `Data for tag, level, and Members is pulled from PUBG.`
    },
  }
  return embed
}

export async function getPlayerStatsLifePUBG(username, platform, gamemode) {
  return await getPlayerStatsLife(username, platform, gamemode)
}
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))