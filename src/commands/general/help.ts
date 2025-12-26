import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';

export default {
    data: new SlashCommandBuilder()
        .setName('ghelp')
        .setDescription('Shows available commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ embeds: [createHelpEmbed()], ephemeral: true });
    },

    async prefixRun(message: any) {
        await message.reply({ embeds: [createHelpEmbed()] });
    }
};

function createHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('Giveaway Commands')
        .setColor(Theme.EmbedColor)
        .setDescription('All commands require **Manage Server** permission.')
        .addFields(
            { name: '/gstart <time> <winners> <prize>', value: 'Quick start a giveaway.' },
            { name: '/gcreate', value: 'Start a giveaway with advanced options (requirements, roles, etc.).' },
            { name: '/gend <message_id>', value: 'End a giveaway immediately.' },
            { name: '/gcancel <message_id>', value: 'Cancel a giveaway.' },
            { name: '/gstop <message_id>', value: 'Pause a giveaway countdown.' },
            { name: '/gresume <message_id>', value: 'Resume a paused giveaway.' },
            { name: '/greroll <message_id>', value: 'Pick a new winner for an ended giveaway.' },
            { name: '/gdelete <message_id>', value: 'Delete a giveaway completely.' },
            { name: '/glist', value: 'List all running giveaways.' },
            { name: '/ghistory', value: 'View complete giveaway history with pagination and Excel export.' },
            { name: '/messages [user]', value: 'Check message count (alias: m).' },
            { name: '/invites [user]', value: 'Check invite count (alias: i).' },
            { name: '/gping', value: 'Check the bot\'s WebSocket ping.' },
            { name: '/gstats', value: 'View detailed bot statistics.' },
            { name: '/ginvite', value: 'Get the bot invite link.' },
            { name: '/gabout', value: 'Bot information.' }
        );
}
