require('dotenv').config();
const { REST, Routes } = require('discord.js');
const teamsCommand = require('./commands/teams');
const positionsCommand = require('./commands/positions');
const qawdtihaCommand = require('./commands/9awdtiha');
const mergedCommand = require('./commands/merged');
const skhiratCommand = require('./commands/skhirat');

const commands = [
    teamsCommand.data.toJSON(),
    positionsCommand.data.toJSON(),
    qawdtihaCommand.data.toJSON(),
    mergedCommand.data.toJSON(),
    skhiratCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Started refreshing application (/) commands...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log('✅ Successfully registered application (/) commands!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
