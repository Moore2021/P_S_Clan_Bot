import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// clanId=clan.f1a574aeab824d3b92c21a25aac8ff1f
const community = {
  name: 'community',
  description: 'Information on the community via PUBG',
  type: 1
}
const commandOptionsUsername = {
  name: 'username',
  description: 'Your ign name',
  type: 3,
  required: true
}
const commandOptionsPlatform = {
  name: 'platform',
  description: "What platform steam, xbox, psn",
  type: 3,
  required: true,
  choices: [
    {
      name: 'steam', value: 'steam'
    }, {
      name: 'psn', value: 'psn'
    }, {
      name: 'xbox', value: 'xbox'
    }
  ]
}
const commandOptionsGamemode = {
  name: "gamemode",
  description: "What gamemode, Solo, Duo, Quad, etc.",
  type: 3,
  required: true,
  choices: [
    {
      name: 'Solo TPP', value: 'solo'
    }, {
      name: 'Duo TPP', value: 'duo'
    }, {
      name: 'Squad TPP', value: 'squad'
    },
    {
      name: 'Solo FPP', value: 'solo-fpp'
    }, {
      name: 'Duo FPP', value: 'duo-fpp'
    }, {
      name: 'Squad FPP', value: 'squad-fpp'
    }
  ]
}
const playerStats = {
  name: 'pubgstats',
  description: 'PUBG stats based on player, platform, and gamemode',
  options: [
    {
      name: "byseason",
      description: "PUBG stats based on player, platform, and gamemode; filtered by current season",
      type: 1,
      options: [commandOptionsUsername, commandOptionsPlatform, commandOptionsGamemode]
    }, {
      name: "lifetime",
      description: "PUBG stats based on player, platform, and gamemode; filtered by lifetime",
      type: 1,
      options: [commandOptionsUsername, commandOptionsPlatform, commandOptionsGamemode]
    }
  ]
}

const addCommunityMember = {
  name:"Add Community Member",
  type: 2
}


const ALL_COMMANDS = [community, playerStats, addCommunityMember];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);