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
    resp.on("data", chunk => {
      data += chunk;
    });
    resp.on("end", () => {
      data = JSON.parse(data);
      if (requestType === `player`) {
        redis.set(`PUBG_${redisKey}`, data.data[0].id, 60 * 1000 * 60 * 24)
      }
      if (requestType === `stats`){
        redis.set(`PUBG_${redisKey}`, JSON.stringify(data.data), 60 * 1000 * 60 * 24)
      }
      if (requestType === `clan_stats`){
        redis.set(`PUBG_${redisKey}`, JSON.stringify(data.data), 60 * 1000 * 60 * 24)
      }
    })
  }).on("error", err => {
    console.log(err);
  });

  return getReq.end();
}

function _getPlayer(username, platform, userID) {
  const endpoint = `/shards/${platform}/players?filter[playerNames]=${username}`;
  return _request(endpoint, `player_${userID}`, `player`);
}

function _getSeasonId(platform){
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
  return redis.set(`PUBG_season_${platform}`, value, 60 * 1000 * 60 * 24) 
}

export async function getPlayerStats(username, platform, userID) {
  if (!await redis.get(`PUBG_player_${userID}`)) {
    _getPlayer(username, platform, userID)
  }

  await delay(1000)
  const playerID = await redis.get(`PUBG_player_${userID}`)
  if (await redis.get(`PUBG_sp_${playerID}_stats`)) {
    const playerStats = JSON.parse(await redis.get(`PUBG_sp_${playerID}_stats`))
    return playerStats.attributes.gameModeStats
  }

  if (!await redis.get(`PUBG_season_${platform}`)) {
    _getSeasonId(platform)
  }
  const seasonID = await redis.get(`PUBG_season_${platform}`)

  await delay(1000)
  const endpoint = `/shards/${platform}/players/${playerID}/seasons/${seasonID}`
  _request(endpoint, `sp_${playerID}_stats`,`stats`)
  await delay(1000)
  const playerStats = JSON.parse(await redis.get(`PUBG_sp_${playerID}_stats`))

  return playerStats.attributes.gameModeStats
}

export async function getClanStats() {
  const endpoint=`/shards/steam/clans/clan.f1a574aeab824d3b92c21a25aac8ff1f`
  const request = _request(endpoint,`clan_stats`, `clan_stats`)
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