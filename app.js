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
  const { type, id, data } = req.body;
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
    // "test" command
    if (name === 'clan') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'The Pop Smoke Gaming Clan, was created and founded by Zen (Also Known as Zenless). est. 2022\nDiscord invite: https://discord.gg/EsPNzSSU',
        },
      });
    }
    //clanId=clan.f1a574aeab824d3b92c21a25aac8ff1f
    if (name === 'claninfo') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [await getClanStatsPUBG()],
        },
      });
    }

    if (name === 'pubgstats') {
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
      //JSON.stringify(stats[gamemode])
      return DiscordRequest(endpoint, { method: 'PATCH', body: { embeds: [stats] } });
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
