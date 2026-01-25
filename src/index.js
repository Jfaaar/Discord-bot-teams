require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const teamsCommand = require('./commands/teams');
const positionsCommand = require('./commands/positions');
const qawdtihaCommand = require('./commands/9awdtiha');
const mergedCommand = require('./commands/merged');
const skhiratCommand = require('./commands/skhirat');
const rosterCommand = require('./commands/roster');
const pollCommand = require('./commands/poll');
const savePositionsCommand = require('./commands/save-positions');
const resetPositionsCommand = require('./commands/reset-positions');
const playCommand = require('./commands/play');
const stopCommand = require('./commands/stop');
const moveCommand = require('./commands/move');

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Store commands in a collection
client.commands = new Collection();
client.commands.set(teamsCommand.data.name, teamsCommand);
client.commands.set(positionsCommand.data.name, positionsCommand);
client.commands.set(qawdtihaCommand.data.name, qawdtihaCommand);
client.commands.set(mergedCommand.data.name, mergedCommand);
client.commands.set(skhiratCommand.data.name, skhiratCommand);
client.commands.set(rosterCommand.data.name, rosterCommand);
client.commands.set(pollCommand.data.name, pollCommand);
client.commands.set(savePositionsCommand.data.name, savePositionsCommand);
client.commands.set(resetPositionsCommand.data.name, resetPositionsCommand);
client.commands.set(playCommand.data.name, playCommand);
client.commands.set(stopCommand.data.name, stopCommand);
client.commands.set(moveCommand.data.name, moveCommand);

// Bot ready event
client.once('ready', () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
  console.log('Registered commands:', Array.from(client.commands.keys()));
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);

    const errorMessage = { content: '❌ There was an error executing this command!', ephemeral: true };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
