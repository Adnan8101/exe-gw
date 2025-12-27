import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';

export default {
    data: new SlashCommandBuilder()
        .setName('gping')
        .setDescription('Check the bot\'s WebSocket ping'),

    async execute(interaction: ChatInputCommandInteraction) {
        
        const sent = Date.now();
        await interaction.deferReply();
        const apiLatency = Date.now() - sent;
        
        const wsPing = interaction.client.ws.ping;
        const wsPingDisplay = wsPing > 0 ? `${wsPing}ms` : 'Calculating...';
        
        const embed = new EmbedBuilder()
            .setTitle('Ping')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: wsPingDisplay, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async prefixRun(message: any) {
        const sent = Date.now();
        const reply = await message.reply('Calculating ping...');
        const apiLatency = Date.now() - sent;
        
        const wsPing = message.client.ws.ping;
        const wsPingDisplay = wsPing > 0 ? `${wsPing}ms` : 'Calculating...';
        
        const embed = new EmbedBuilder()
            .setTitle('Ping')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: wsPingDisplay, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();

        await reply.edit({ content: '', embeds: [embed] });
    }
};
