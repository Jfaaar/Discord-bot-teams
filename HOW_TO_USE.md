# 🤖 Discord Bot User Guide

Welcome to your custom Discord bot! This bot helps organize teams, assign positions for matches (e.g., FIFA/EAFC Pro Clubs), and manage voice channels.

## 🚀 Getting Started

Ensure the bot is online and has the necessary permissions in your server.
Commands are used via **Slash Commands** (type `/` and select the command).

---

## 📋 Commands List

### ⚽ Team Management

- **/teams**
  - **Description:** Splits all players currently in the **source voice channel** into two balanced teams (FC Merged vs. Skhirat FC).
  - **Usage:** Join the voice channel with your friends and run `/teams`.
  - **Note:** Moves players automatically to their respective team voice channels.

- **/positions `[formation]`**
  - **Description:** Auto-assigns positions to players based on a chosen formation.
  - **Supported Formations:**
    - `4-2-1-3`
    - `4-1-2-1-2`
  - **Usage:** `/positions formation:4-2-1-3`
  - **How it works:** Reads preferred positions if configured, otherwise assigns randomly based on role priority (Attack > Midfield > Defense).

- **/poll**
  - **Description:** Creates an interactive poll where players can select their preferred positions for the match.
  - **Usage:** Run `/poll` before a game session.

- **/save-positions `[message_id]`**
  - **Description:** Saves the selected positions from a poll so the bot "learns" player preferences for future `/positions` assignments.
  - **Usage:** Right-click the poll message -> "Copy ID" -> paste into command.

- **/reset-positions `[player]`**
  - **Description:** Clears saved position preferences.
  - **Usage:**
    - `/reset-positions` (clears ALL data)
    - `/reset-positions player:@User` (clears just that user)

### 📢 Voice Channel Management

- **/merged**
  - **Description:** Moves **everyone** in the server to the **Merged** voice channel.
  - **Usage:** Great for gathering everyone after a game.

- **/skhirat**
  - **Description:** Moves **everyone** in the server to the **Skhirat** voice channel.

- **/9awdtiha `[user]`**
  - **Description:** Moves you and a specifically tagged user to a private voice channel.
  - **Usage:** `/9awdtiha user:@Friend`

### 🎵 Music

- **/play `[song]`**
  - **Description:** Plays a song from YouTube in your voice channel.
  - **Usage:** `/play song:lofi hip hop`

- **/stop**
  - **Description:** Stops the music and disconnects the bot.

---

## 🛠️ Advanced Configuration

### Player Roles (Auto-Positioning)

The bot can remember player preferences. You can define these in `src/data/player-roles.json` manually or use the `/poll` + `/save-positions` workflow to build this list automatically over time.

### Troubleshooting

- **"Bot is not configured properly"**: Check your `.env` file to ensure all Channel IDs (`SOURCE_VOICE_CHANNEL_ID`, `TEAM1_VOICE_CHANNEL_ID`, etc.) are correct.
- **Commands not showing up?**: Ask an admin to re-run `node src/deploy-commands.js` to refresh the command list.
