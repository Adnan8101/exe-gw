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
        
        let wsPing = interaction.client.ws.ping;
        
        if (wsPing <= 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            wsPing = interaction.client.ws.ping;
        }
        
        const wsPingDisplay = wsPing > 0 ? `${wsPing}ms` : 'N/A';
        
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
        
        let wsPing = message.client.ws.ping;
        
        if (wsPing <= 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            wsPing = message.client.ws.ping;
        }
        
        const wsPingDisplay = wsPing > 0 ? `${wsPing}ms` : 'N/A';
        
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
