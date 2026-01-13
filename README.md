# Discord Team Splitter Bot

A Discord bot that randomly splits voice channel players into two teams: **FC MERGED** and **Skhirat FC**.

## Setup

1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application and add a bot
   - Copy the bot token and client ID

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your values:
   - `DISCORD_TOKEN` - Your bot token
   - `CLIENT_ID` - Your application ID
   - `GUILD_ID` - Your server ID
   - `SOURCE_VOICE_CHANNEL_ID` - Channel where players gather
   - `TEAM1_VOICE_CHANNEL_ID` - Channel for FC MERGED
   - `TEAM2_VOICE_CHANNEL_ID` - Channel for Skhirat FC
   - `TEAMS_TEXT_CHANNEL_ID` - Text channel for announcements

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Invite Bot to Server**
   Use this URL format (replace YOUR_CLIENT_ID with your bot's client ID):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=19991552&scope=bot%20applications.commands
   ```
   Required permissions: Move Members, Send Messages, Embed Links, Connect, Speak

5. **Deploy Commands**
   ```bash
   npm run deploy
   ```

6. **Start Bot**
   ```bash
   npm start
   ```

## Usage

1. Have players join the source voice channel
2. Run `/teams` in any text channel
3. Players are randomly split and moved to team channels
4. Team composition is posted in the designated text channel

## Project Structure

```
discord-bot/
├── src/
│   ├── index.js           # Bot entry point
│   ├── deploy-commands.js # Command registration
│   └── commands/
│       └── teams.js       # /teams command
├── .env.example           # Environment template
├── .gitignore
├── package.json
└── README.md
```
