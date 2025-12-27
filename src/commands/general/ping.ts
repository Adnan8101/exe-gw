import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';

export default {
    data: new SlashCommandBuilder()
        .setName('gping')
        .setDescription('Check the bot\'s WebSocket ping'),

    async execute(interaction: ChatInputCommandInteraction) {
        
        const start = Date.now();
        await interaction.deferReply();
        const deferLatency = Date.now() - start;
        
        const editStart = Date.now();
        await interaction.editReply('Pinging...');
        const apiLatency = Date.now() - editStart;
        
        const wsPing = interaction.client.ws.ping;
        const wsPingDisplay = wsPing > 0 ? `${wsPing}ms` : `${Math.round(deferLatency)}ms`;
        
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: wsPingDisplay, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ content: '', embeds: [embed] });
    },

    async prefixRun(message: any) {
        const start = Date.now();
        const reply = await message.reply('🏓 Pinging...');
        const messageLatency = Date.now() - start;
        
        const editStart = Date.now();
        await reply.edit('Calculating...');
        const apiLatency = Date.now() - editStart;
        
        const wsPing = message.client.ws.ping;
        const wsPingDisplay = wsPing > 0 ? `${wsPing}ms` : `${Math.round(messageLatency)}ms`;
        
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(Theme.EmbedColor)
            .addFields(
                { name: 'WebSocket Ping', value: wsPingDisplay, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();

        await reply.edit({ content: '', embeds: [embed] });
    }
};
