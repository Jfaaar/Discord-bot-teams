const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a user, a role, or everyone to a specific voice channel')
        .addMentionableOption(option =>
            option.setName('target')
                .setDescription('The user or role to move')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The destination voice channel')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getMentionable('target');
        const destinationChannel = interaction.options.getChannel('channel');
        const guild = interaction.guild;

        // Ensure the bot has permission to move members
        if (!guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return interaction.editReply('❌ I do not have permission to move members.');
        }

        // Check if destination channel is viewable and connectable
        if (!destinationChannel.viewable || !destinationChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.Connect)) {
             return interaction.editReply(`❌ I cannot access or connect to ${destinationChannel}.`);
        }

        let movedCount = 0;
        let totalToMove = 0;

        try {
            // Case 1: Target is a User
            if (target.user) {
                const member = await guild.members.fetch(target.user.id).catch(() => null);
                
                if (!member) {
                     return interaction.editReply('❌ User not found in this guild.');
                }

                if (!member.voice.channel) {
                     return interaction.editReply(`❌ ${member.user.tag} is not currently in a voice channel.`);
                }

                if (member.voice.channelId === destinationChannel.id) {
                     return interaction.editReply(`❌ ${member.user.tag} is already in ${destinationChannel}.`);
                }

                await member.voice.setChannel(destinationChannel);
                return interaction.editReply(`✅ Moved ${member.user.tag} to ${destinationChannel}.`);
            }
            
            // Case 2: Target is a Role (or @everyone)
            // If it's a role, target has an id. We need to find members with this role.
            // Note: target.members might not be populated or accurate depending on cache, 
            // so we iterate through voice states of the guild for better reliability regarding voice status.

            const voiceStates = guild.voiceStates.cache;
            const membersToMove = [];

            // Helper check if member has role
            const hasRole = (member) => {
                if (target.id === guild.id) return true; // @everyone
                return member.roles.cache.has(target.id);
            };

            for (const [memberId, voiceState] of voiceStates) {
                // Skip if not in a channel or already in destination
                if (!voiceState.channelId || voiceState.channelId === destinationChannel.id) continue;
                
                const member = voiceState.member;
                if (!member) continue;

                if (hasRole(member)) {
                    membersToMove.push(member);
                }
            }

            totalToMove = membersToMove.length;

            if (totalToMove === 0) {
                return interaction.editReply(`❌ No members found with that role in other voice channels.`);
            }

            const movePromises = membersToMove.map(member => 
                member.voice.setChannel(destinationChannel).catch(err => {
                    console.error(`Failed to move ${member.user.tag}:`, err);
                    return null;
                })
            );

            const results = await Promise.all(movePromises);
            movedCount = results.filter(r => r !== null).length;

            return interaction.editReply(`✅ Moved ${movedCount}/${totalToMove} members to ${destinationChannel}.`);

        } catch (error) {
            console.error('Error in /move command:', error);
            return interaction.editReply('❌ An error occurred while trying to move members.');
        }
    },
};
