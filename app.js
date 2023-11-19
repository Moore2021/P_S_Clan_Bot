import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest, getPlayerStatsPUBG, delay, getClanStatsPUBG, getPlayerStatsLifePUBG } from './utils.js';
import { createClient } from 'redis';

export const redis = await createClient()
  .on('error', err => console.log('Redis Client Error', err))
  .connect();

redis.flushAll()

/**
 * await client.set('key', 'value');
 * const value = await client.get('key');
 */

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data, guild_id, member } = req.body;
  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;
    if (name === `Add Community Member`) {

      const { resolved: { members, users }, target_id } = data
      members[target_id].nick = members[target_id].nick == null ? `[P-S] ${users[target_id].global_name}` : members[target_id].nick.startsWith(`[P-S] `) ? `${members[target_id].nick}` :`[P-S] ${members[target_id].nick}`;
      const communityRoleId = `1168703590102220851`
      const guestRoleId = `1168706115052261487`
      function removeValue(value, index, arr) {
        const guestRoleId = `1168706115052261487`
        // If the value at the current array index matches the specified value (2)
        if (value == guestRoleId) {
          // Removes the value from the original array
          arr.splice(index, 1);
          return true;
        }
        return false;
      }
      if (members[target_id].roles.includes(guestRoleId)) members[target_id].roles.filter(removeValue)
      if (!members[target_id].roles.includes(communityRoleId)) members[target_id].roles.push(communityRoleId);
      const endpoint = `/guilds/${guild_id}/members/${target_id}`;
      DiscordRequest(endpoint, {
        method: 'PATCH', body: {
          nick: members[target_id].nick,
          roles: members[target_id].roles
        }
      });
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Ok, ${users[target_id].global_name}'s nickname has been updated, and roles have been swapped..`,
        },
      });
    }

    //clanId=clan.f1a574aeab824d3b92c21a25aac8ff1f
    if (name === 'community') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [await getClanStatsPUBG()],
        },
      });
    }

    if (name === 'lfg') {
      const { options } = data
      const message = options[0].value
      const channel = options[1] ? options[1].value : false
      const embed = {
        "type": "rich",
        "title": `${member.nick ? member.nick : member.user.global_name} - LFG`,
        "description": channel ? `${message}\nin channel: <#${channel}>` : `${message}`,
        "color": 0x00FFFF,
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [embed],
        },
      });
    }

    if (name === 'pubgstats') {
      if (await redis.exists(`pubgstats_cmd_cooldown`)) {
        if (await redis.get(`pubgstats_cmd_cooldown`) == `true`) return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Sorry, command is on cooldown for 1 minute'
          },
        });
      }
      redis.set(`pubgstats_cmd_cooldown`, `true`, { EX: 60 })
      res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      });

      let stats;
      const { options } = data
      const username = options[0].options[0].value;
      const platform = options[0].options[1].value;
      const gamemode = options[0].options[2].value;

      if (options[0].name === `lifetime`) {
        stats = await getPlayerStatsLifePUBG(username, platform, gamemode);
      } else if (options[0].name === `byseason`) {
        stats = await getPlayerStatsPUBG(username, platform, gamemode);
      }

      const { application_id, token } = req.body;
      const endpoint = `/webhooks/${application_id}/${token}/messages/@original`;
      let body;
      if (stats.type === `embed`) {
        body = { embeds: [stats.formattedStats] }
      } else if (stats.type === `error`) {
        body = { content: stats.error }
      }
      return DiscordRequest(endpoint, { method: 'PATCH', body: body });
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
