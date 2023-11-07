import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Simple test command
const clan = {
  name: 'clan',
  description: 'Information about the clan',
  type: 1,
};

// clanId=clan.f1a574aeab824d3b92c21a25aac8ff1f
const claninfo = {
  name: 'claninfo',
  description: 'Information on the clan via PUBG',
  type: 1
}
const playerinfo = {
  name: 'pubgstats',
  description: 'PUBG stats based on player and platform',
  type: 1,
  options: [{
    name: 'username',
    description: 'Your ign name',
    type: 3,
    required: true
  },{
    name: 'platform',
    description: "What platform steam, xbox, psn",
    type: 3,
    required: true,
    choices:[
      {
        name: 'steam', value: 'steam'
      },{
        name: 'psn', value: 'psn'
      },{
        name: 'xbox', value: 'xbox'
      }
    ]
  }]
}

const ALL_COMMANDS = [clan, claninfo, playerinfo];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);