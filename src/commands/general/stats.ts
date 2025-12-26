import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import * as os from 'os';

export default {
    data: new SlashCommandBuilder()
        .setName('gstats')
        .setDescription('View detailed bot statistics'),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ embeds: [await createStatsEmbed(interaction)] });
    },

    async prefixRun(message: any) {
        await message.reply({ embeds: [await createStatsEmbed(message)] });
    }
};

async function createStatsEmbed(interaction: any) {
    const client = interaction.client;
    
    // Calculate uptime
    const uptime = client.uptime || 0;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor(uptime / 3600000) % 24;
    const minutes = Math.floor(uptime / 60000) % 60;
    const seconds = Math.floor(uptime / 1000) % 60;
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const memoryTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);

    // System info
    const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const cpuModel = os.cpus()[0].model;
    const cpuCores = os.cpus().length;

    // Discord stats
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc: number, guild: any) => acc + guild.memberCount, 0);
    const channelCount = client.channels.cache.size;
    const wsPing = client.ws.ping;

    const embed = new EmbedBuilder()
        .setTitle('Bot Statistics')
        .setColor(Theme.EmbedColor)
        .addFields(
            { 
                name: 'Bot Information', 
                value: `**Uptime:** ${uptimeString}\n**WebSocket Ping:** ${wsPing}ms\n**Node.js Version:** ${process.version}`,
                inline: false 
            },
            { 
                name: 'Discord Stats', 
                value: `**Guilds:** ${guildCount.toLocaleString()}\n**Users:** ${userCount.toLocaleString()}\n**Channels:** ${channelCount.toLocaleString()}`,
                inline: true 
            },
            { 
                name: 'Memory Usage', 
                value: `**Bot:** ${memoryUsed}MB / ${memoryTotal}MB\n**System:** ${(parseFloat(totalMemory) - parseFloat(freeMemory)).toFixed(2)}GB / ${totalMemory}GB`,
                inline: true 
            },
            { 
                name: 'System Information', 
                value: `**CPU:** ${cpuModel}\n**Cores:** ${cpuCores}\n**Platform:** ${os.platform()} ${os.arch()}`,
                inline: false 
            }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user?.tag || interaction.author?.tag}` });

    return embed;
}
