import https from 'https'
import { redis } from './app.js'
import seasons from './seasons.json' assert {type: "json"}
import { delay } from './utils.js'

function _request(endpoint, redisKey, requestType) {
  if (!requestType) return
  const apiKey = process.env.PUBG_API_KEY;
  const options = {
    hostname: 'api.pubg.com',
    path: endpoint,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.api+json'
    }
  };

  var getReq = https.request(options, (resp) => {
    // log the data
    let data = "";
    console.log(resp.statusCode); // Log the HTTP response status code
    const statusCode = resp.statusCode
    resp.on("data", chunk => {
      data += chunk;
    });
    resp.on("end", () => {
      if (statusCode != 200) {
        redis.set(`PUBG_API_ERROR`, statusCode)
      } else {
        data = JSON.parse(data);
        if (requestType === `player`) {
          redis.set(`PUBG_${redisKey}`, data.data[0].id, 60 * 1000 * 60 * 24)
        }
        if (requestType === `stats`) {
          redis.set(`PUBG_${redisKey}`, JSON.stringify(data.data), 60 * 1000 * 60 * 24)
        }
        if (requestType === `clan_stats`) {
          redis.set(`PUBG_${redisKey}`, JSON.stringify(data.data), 60 * 1000 * 60 * 24)
        }
      }
    })
  }).on("error", err => {
    console.log(err);
  });
  return getReq.end();
}

async function _getPlayer(username, platform) {
  const redisKey = `player_${username}`
  let playerID = await redis.get(`PUBG_${redisKey}`)
  if (playerID) return playerID
  const endpoint = `/shards/${platform}/players?filter[playerNames]=${username}`;
  const req = _request(endpoint, redisKey, `player`);
  await delay(1000)
  const statusCode = await redis.get(`PUBG_API_ERROR`)
  if (statusCode == 401 || statusCode == 404 || statusCode == 415 || statusCode == 401 || statusCode == 429) return statusCode
  playerID = await redis.get(`PUBG_${redisKey}`)
  return playerID
}

async function retrieveStats(key) {
  let stats = await redis.get(key)
  if (stats) {
    const playerStats = JSON.parse(stats)
    return playerStats.attributes.gameModeStats
  }
  return false
}

async function _getSeasonId(platform) {
  let season = await redis.get(`PUBG_season_${platform}`)
  if (season) return season
  let value = ""
  function getCurrentSeason(data) {
    let obj = data.find(o => o.attributes.isCurrentSeason === true)
    return obj.id
  }
  switch (platform) {
    case `steam`:
      value = getCurrentSeason(seasons.PC)
      break;
    case `psn`:
      value = getCurrentSeason(seasons.PS4)
      break;
    case `xbox`:
      value = getCurrentSeason(seasons.XBOX)
      break;
    default:
      value = getCurrentSeason(seasons.PC)
      break;
  }
  redis.set(`PUBG_season_${platform}`, value, 60 * 1000 * 60 * 24)
  await delay(1000)
  return value
}

function testResponsePlayer(code) {
  if (code == 404) {
    return `Sorry, that user wasn't found. Please make sure the username is correct (case sensitive), and platform is correct.`
  } else if (code == 415 || code == 401 || code == 401) {
    return `Sorry, backend issue, please notify developer (thefryingpan)`
  } else if (code == 429) {
    return `Please wait a little bit, I have made too many requests`
  }
  return true
}

export async function getPlayerStatsLife(username, platform, gamemode) {
  const playerID = await _getPlayer(username, platform)
  const testPlayer = testResponsePlayer(playerID)
  await redis.del(`PUBG_API_ERROR`)
  if (testPlayer != true) return testPlayer
  const redisStatKey = `${playerID}_stats_life_${platform}`
  let playerStats = await retrieveStats(`PUBG_${redisStatKey}`)
  if (playerStats != false) return playerStats;

  const endpoint = `/shards/${platform}/players/${playerID}/seasons/lifetime`
  _request(endpoint, redisStatKey, `stats`)
  await delay(1000)
  const stats = await retrieveStats(`PUBG_${redisStatKey}`)
  return formatPlayerStats(stats[gamemode], username, gamemode, platform)
  return JSON.stringify(stats[gamemode])
}

export async function getPlayerStats(username, platform, gamemode) {
  const playerID = await _getPlayer(username, platform)
  const testPlayer = testResponsePlayer(playerID)
  await redis.del(`PUBG_API_ERROR`)
  if (testPlayer != true) return testPlayer
  const redisStatKey = `${playerID}_stats_${platform}`
  let playerStats = await retrieveStats(`PUBG_${redisStatKey}`)
  if (playerStats != false) return playerStats;

  const seasonID = await _getSeasonId(platform)

  const endpoint = `/shards/${platform}/players/${playerID}/seasons/${seasonID}`
  _request(endpoint, redisStatKey, `stats`)
  await delay(1000)

  const stats = await retrieveStats(`PUBG_${redisStatKey}`)
  return JSON.stringify(stats[gamemode])
}

export async function getClanStats() {
  const endpoint = `/shards/steam/clans/clan.f1a574aeab824d3b92c21a25aac8ff1f`
  const request = _request(endpoint, `clan_stats`, `clan_stats`)
  await delay(1000)
  const clanDetails = JSON.parse(await redis.get(`PUBG_clan_stats`))
  const embed = {
    "type": "rich",
    "title": `PoP-Smoke`,
    "description": "",
    "color": 0x00FFFF,
    "fields": [
      {
        "name": `Clan Tag`,
        "value": clanDetails.attributes.clanTag,
        "inline": true
      },
      {
        "name": `Clan Level`,
        "value": `${clanDetails.attributes.clanLevel}`,
        "inline": true
      },
      {
        "name": `Clan Member Count`,
        "value": `${clanDetails.attributes.clanMemberCount}`,
        "inline": true
      }
    ],
    "thumbnail": {
      "url": `https://media.discordapp.net/attachments/1168703085321932861/1168774202724208661/BANNER.png?ex=6552fccc&is=654087cc&hm=9c8ed20675d803b27363fb855ded92cc2ee6eea348a946b85d377469dd3e9c9c&=`,
      "height": 0,
      "width": 0
    },
    "author": {
      "name": "Owner: Zen"
    }
  }
  return embed
}


function formatPlayerStats(stats, username, gamemode, platform) {
  const { damageDealt, kills, wins, assists, dBNOs, headshotKills, maxKillStreaks, revives, roadKills, roundMostKills, roundsPlayed, suicides, teamKills, top10s, vehicleDestroys, longestKill } = stats
  function fppOrTpp(g) {
    if ([`solo`, `duo`, `squad`].some((value) => {
      if (value == g) return true;
    }
    )) {
      return `TPP`
    } else {
      return `FPP`
    }
  }
  const mode = fppOrTpp(gamemode)
  const embed =
  {
    "type": "rich",
    "title": `\`${username}'s ${mode} stats\``,
    "description": `Your stats for ${mode == `TPP` ? `Third` : `First`}-person perspective (${mode == `TPP` ? `TPP` : `FPP`}).`,
    "color": 0x00FFFF,
    "fields": [
      {
        "name": `K/D Ratio`,
        "value": `\`1.30\``,
        "inline": true
      },
      {
        "name": `KDA Ratio`,
        "value": `\`1.58\``,
        "inline": true
      },
      {
        "name": `Top 10%`,
        "value": `\`${Math.round((top10s / roundsPlayed) * 100).toFixed(1)}\` %`,
        "inline": true
      },
      {
        "name": `Win%`,
        "value": `\`${Math.round((wins / roundsPlayed) * 100).toFixed(1)}\`%`,
        "inline": true
      },
      {
        "name": `Kills`,
        "value": `\`${kills}\``,
        "inline": true
      },
      {
        "name": `Damage per match`,
        "value": `\`166.49\``,
        "inline": true
      },
      {
        "name": `Assists`,
        "value": `\`${assists}\``,
        "inline": true
      },
      {
        "name": `Knockdowns`,
        "value": `\`${dBNOs}\``,
        "inline": true
      },
      {
        "name": `Headshot&`,
        "value": `\`${Math.round((headshotKills / kills) * 100).toFixed(1)}\`%`,
        "inline": true
      },
      {
        "name": `Max Kill Streak`,
        "value": `\`${maxKillStreaks}\``,
        "inline": true
      },
      {
        "name": `Most Kills`,
        "value": `\`${roundMostKills}\``,
        "inline": true
      },
      {
        "name": `longest Kill`,
        "value": `\`${Math.round(longestKill).toFixed(1)}\`m`,
        "inline": true
      },
      {
        "name": `team kills`,
        "value": `\`${teamKills}\``,
        "inline": true
      },
      {
        "name": `Suicides`,
        "value": `\`${suicides}\``,
        "inline": true
      },
      {
        "name": `road Kills`,
        "value": `\`${roadKills}\``,
        "inline": true
      },
      {
        "name": `vechicles Destroyed`,
        "value": `\`${vehicleDestroys}\``,
        "inline": true
      },
      {
        "name": `teammate revives`,
        "value": `\`${revives}\``,
        "inline": true
      },
      {
        "name": `Matches played`,
        "value": `\`${roundsPlayed}\``,
        "inline": true
      }
    ],
    "footer": {
      "text": `linked is your stats on tracker.gg`
    },
    "url": `https://tracker.gg/pubg/profile/${platform}/${username}/details`
  }
  return embed
}