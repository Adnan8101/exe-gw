import { prisma } from '../../utils/database';

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const OWNER_ID = '929297205796417597';

export default {
    data: new SlashCommandBuilder()
        .setName('guildmanage')
        .setDescription('Manage allowed guilds (Developer only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a guild to the allowed list')
                .addStringOption(option =>
                    option.setName('guild_id')
                        .setDescription('The guild ID to allow')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a guild from the allowed list')
                .addStringOption(option =>
                    option.setName('guild_id')
                        .setDescription('The guild ID to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show all allowed guilds')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} This command is developer only.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'add') {
                const guildId = interaction.options.getString('guild_id', true);
                
                
                const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
                if (!guild) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Guild not found. Make sure the bot is in that guild.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                
                const existing = await prisma.allowedGuild.findUnique({
                    where: { guildId }
                });

                if (existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} **${guild.name}** is already in the allowed list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                
                await prisma.allowedGuild.create({
                    data: {
                        guildId: guildId,
                        guildName: guild.name,
                        addedBy: interaction.user.id
                    }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully added **${guild.name}** (\`${guildId}\`) to the allowed list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'remove') {
                const guildId = interaction.options.getString('guild_id', true);

                const existing = await prisma.allowedGuild.findUnique({
                    where: { guildId }
                });

                if (!existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Guild is not in the allowed list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                await prisma.allowedGuild.delete({
                    where: { guildId }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully removed **${existing.guildName}** (\`${guildId}\`) from the allowed list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'show') {
                const allowedGuilds = await prisma.allowedGuild.findMany({
                    orderBy: { createdAt: 'desc' }
                });

                if (allowedGuilds.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No guilds in the allowed list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('Allowed Guilds')
                    .setDescription(`Total: **${allowedGuilds.length}** guilds`)
                    .setColor(Theme.EmbedColor)
                    .setTimestamp();

                allowedGuilds.forEach((guild, index) => {
                    embed.addFields({
                        name: `${index + 1}. ${guild.guildName}`,
                        value: `ID: \`${guild.guildId}\`\nAdded: <t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error: any) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} Error: ${error.message}`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async prefixRun(message: any, args: string[]) {
        if (message.author.id !== OWNER_ID) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} This command is developer only.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || !['add', 'remove', 'show'].includes(subcommand)) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} **Invalid Usage**\n\`\`\`!guildmanage <add|remove|show> [guild_id]\`\`\``)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        try {
            if (subcommand === 'add') {
                const guildId = args[1];
                if (!guildId) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Please provide a guild ID.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }

                const guild = await message.client.guilds.fetch(guildId).catch(() => null);
                if (!guild) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Guild not found. Make sure the bot is in that guild.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }

                const existing = await prisma.allowedGuild.findUnique({
                    where: { guildId }
                });

                if (existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} **${guild.name}** is already in the allowed list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }

                await prisma.allowedGuild.create({
                    data: {
                        guildId: guildId,
                        guildName: guild.name,
                        addedBy: message.author.id
                    }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully added **${guild.name}** (\`${guildId}\`) to the allowed list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                await message.reply({ embeds: [embed] });

            } else if (subcommand === 'remove') {
                const guildId = args[1];
                if (!guildId) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Please provide a guild ID.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }

                const existing = await prisma.allowedGuild.findUnique({
                    where: { guildId }
                });

                if (!existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Guild is not in the allowed list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }

                await prisma.allowedGuild.delete({
                    where: { guildId }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully removed **${existing.guildName}** (\`${guildId}\`) from the allowed list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                await message.reply({ embeds: [embed] });

            } else if (subcommand === 'show') {
                const allowedGuilds = await prisma.allowedGuild.findMany({
                    orderBy: { createdAt: 'desc' }
                });

                if (allowedGuilds.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No guilds in the allowed list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }

                const embed = new EmbedBuilder()
                    .setTitle('Allowed Guilds')
                    .setDescription(`Total: **${allowedGuilds.length}** guilds`)
                    .setColor(Theme.EmbedColor)
                    .setTimestamp();

                allowedGuilds.forEach((guild, index) => {
                    embed.addFields({
                        name: `${index + 1}. ${guild.guildName}`,
                        value: `ID: \`${guild.guildId}\`\nAdded: <t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`,
                        inline: false
                    });
                });

                await message.reply({ embeds: [embed] });
            }
        } catch (error: any) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} Error: ${error.message}`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
    }
};
