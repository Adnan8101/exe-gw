import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';

export default {
    data: new SlashCommandBuilder()
        .setName('gabout')
        .setDescription('Shows information about the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ embeds: [createAboutEmbed()], ephemeral: true });
    },

    async prefixRun(message: any) {
        await message.reply({ embeds: [createAboutEmbed()] });
    }
};

function createAboutEmbed() {
    return new EmbedBuilder()
        .setTitle('🤖 About Extreme Giveaways')
        .setDescription('Advanced Giveaway Bot with modern features.')
        .addFields(
            { name: 'Developer', value: 'Adnan', inline: true },
            { name: 'Version', value: '1.0.0', inline: true },
            { name: 'Language', value: 'TypeScript + Discord.js', inline: true }
        )
        .setColor(Theme.EmbedColor)
        .setFooter({ text: 'Excellence in Giveaways' });
}
