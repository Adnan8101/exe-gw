import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';

export default {
    data: new SlashCommandBuilder()
        .setName('ginvite')
        .setDescription('Get the bot invite link')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ embeds: [createInviteEmbed(interaction.client.user.id)], ephemeral: true });
    },

    async prefixRun(message: any) {
        await message.reply({ embeds: [createInviteEmbed(message.client.user.id)] });
    }
};

function createInviteEmbed(clientId: string) {
    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

    return new EmbedBuilder()
        .setTitle('🔗 Invite Me')
        .setDescription(`[Click here to invite the bot to your server](${inviteLink})`)
        .setColor(Theme.EmbedColor);
}
