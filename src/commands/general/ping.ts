import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';

export default {
    data: new SlashCommandBuilder()
        .setName('gping')
        .setDescription('Check the bot\'s WebSocket ping'),

    async execute(interaction: ChatInputCommandInteraction) {
        
        await interaction.deferReply();
        
        const wsPing = interaction.client.ws.ping;
        
        const sent = Date.now();
        await interaction.editReply('Calculating...');
        const apiLatency = Date.now() - sent;
        
        const embed = new EmbedBuilder()
            .setTitle('Ping')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: wsPing >= 0 ? `${wsPing}ms` : 'N/A', inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ content: '', embeds: [embed] });
    },

    async prefixRun(message: any) {
        const reply = await message.reply('Calculating ping...');
        
        const wsPing = message.client.ws.ping;
        
        const sent = Date.now();
        await reply.edit('Calculating...');
        const apiLatency = Date.now() - sent;
        
        const embed = new EmbedBuilder()
            .setTitle('Ping')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: wsPing >= 0 ? `${wsPing}ms` : 'N/A', inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();

        await reply.edit({ content: '', embeds: [embed] });
    }
};
