import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';

export default {
    data: new SlashCommandBuilder()
        .setName('gping')
        .setDescription('Check the bot\'s WebSocket ping'),

    async execute(interaction: ChatInputCommandInteraction) {
        const wsPing = interaction.client.ws.ping;
        
        const embed = new EmbedBuilder()
            .setTitle('Ping')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: `${wsPing}ms`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async prefixRun(message: any) {
        const wsPing = message.client.ws.ping;
        
        const embed = new EmbedBuilder()
            .setTitle('Ping')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: `${wsPing}ms`, inline: true }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
