const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CallTracker = require('../utils/CallTracker');

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('call-stats')
    .setDescription('View voice call statistics')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period for stats')
        .setRequired(true)
        .addChoices(
          { name: 'Weekly', value: 'weekly' },
          { name: 'Monthly', value: 'monthly' },
          { name: 'All Time', value: 'all_time' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter by specific user')
        .setRequired(false)),

  async execute(interaction) {
    const period = interaction.options.getString('period');
    const targetUser = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    const stats = CallTracker.getStats(guildId, period);

    const embed = new EmbedBuilder()
      .setTitle(`Voice Call Statistics - ${period.charAt(0).toUpperCase() + period.slice(1)}`)
      .setColor(0x0099FF)
      .setTimestamp();

    if (Object.keys(stats).length === 0) {
      embed.setDescription('No data found for this period.');
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (targetUser) {
      const userStats = stats[targetUser.id];
      if (userStats) {
        embed.setDescription(`Stats for <@${targetUser.id}>`);
        embed.addFields(
          { name: 'Total Duration', value: formatDuration(userStats.totalDuration), inline: true },
          { name: 'Sessions', value: userStats.sessions.toString(), inline: true },
          { name: 'Last Seen', value: userStats.lastSeen ? `<t:${Math.floor(userStats.lastSeen / 1000)}:R>` : 'Never', inline: true }
        );
      } else {
        embed.setDescription(`No data found for <@${targetUser.id}> in this period.`);
      }
    } else {
      // Top 10 leaderboard
      const sortedUsers = Object.entries(stats)
        .sort(([, a], [, b]) => b.totalDuration - a.totalDuration)
        .slice(0, 10);

      let description = '';
      sortedUsers.forEach(([userId, stat], index) => {
        description += `${index + 1}. <@${userId}>: **${formatDuration(stat.totalDuration)}** (${stat.sessions} sessions)\n`;
      });
      
      embed.setDescription(description);
    }

    await interaction.reply({ embeds: [embed] });
  },
};
