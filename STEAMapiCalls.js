import https from 'https'
import { redis } from './app.js'
import { delay } from './utils.js'
import {XMLParser} from 'fast-xml-parser'

async function _request(endpoint, redisKey) {
    const options = {
      hostname: 'steamcommunity.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'Accept': 'application/xml'
      }
    };
    const parser = new XMLParser();
    var getReq = https.request(options, (resp) => {
      // log the data
      let data = "";
      console.log(resp.statusCode); // Log the HTTP response status code
      const statusCode = resp.statusCode
      resp.on("data", chunk => {
        data += chunk;
      });
      resp.on("end", () => {
          const result = parser.parse(data);
          const xmlToJSON = JSON.stringify(result)
          redis.set(redisKey, xmlToJSON,{EX: 60 * 1000 * 60})
      })
    }).on("error", err => {
      console.log(err);
    });
    return getReq.end();
  }

export async function getSteamGroup(){
  const redisKey = `STEAM_GROUP`
  let steamGroupData = JSON.parse(await redis.get(redisKey))
  if (!steamGroupData) {
    const endpoint = `/gid/103582791474109088/memberslistxml/?xml=1`
    await _request(endpoint, redisKey)
    await delay(1000)
    const JSONString = await redis.get(redisKey)
    steamGroupData = JSON.parse(JSONString)
  }
  const result = {
    memberCount: steamGroupData.memberList.memberCount
  }
  return result
}