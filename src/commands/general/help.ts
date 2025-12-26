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
        .setTitle('🎉 Bot Commands')
        .setColor(Theme.EmbedColor)
        .setDescription('Here are all available commands:')
        .addFields(
            { name: '**Giveaway Commands** (Manage Server required)', value: '`/gstart` - Quick start a giveaway\n`/gcreate` - Advanced giveaway creation\n`/gend <id>` - End a giveaway\n`/gcancel <id>` - Cancel a giveaway\n`/gstop <id>` - Pause a giveaway\n`/gresume <id>` - Resume a paused giveaway\n`/greroll <id>` - Reroll winners\n`/gdelete <id>` - Delete a giveaway\n`/glist` - List all giveaways\n`/ghistory` - View giveaway history\n`/grefresh` - Refresh giveaway embeds\n`/gschedule` - Schedule a giveaway' },
            { name: '**Statistics Commands**', value: '`/messages [@user]` or `!m [@user]` - Check message count\n`/vc [@user]` - Check voice time stats\n`/invites [@user]` or `!i [@user]` - Check invite count\n`/lb -m` - Message leaderboard\n`/lb -v` - Voice time leaderboard\n`/lb -i` - Invite leaderboard' },
            { name: '**Admin Commands** (Manage Server required)', value: '`/blacklist add/remove/show` - Manage tracking blacklist\n`/setprefix <prefix>` - Set custom prefix\n`/np add/remove/show` - Manage no-prefix users (Owner only)' },
            { name: '**General Commands**', value: '`/gping` - Check bot latency\n`/gstats` - View bot statistics\n`/ginvite` - Get bot invite link\n`/gabout` - Bot information\n`/bsetting` - View birthday settings' }
        )
        .setFooter({ text: 'Use prefix ! or / for commands • Created by Exe Team' })
        .setTimestamp();
}
