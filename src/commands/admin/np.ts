import { prisma } from '../../utils/database';

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const OWNER_ID = '929297205796417597';

export default {
    data: new SlashCommandBuilder()
        .setName('np')
        .setDescription('Manage no-prefix users (Owner only)')
        .setDefaultMemberPermissions(0)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to no-prefix list')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from no-prefix list')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show all no-prefix users')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} This command is owner only.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'add') {
                const user = interaction.options.getUser('user', true);

                
                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} **${user.tag}** is already in the no-prefix list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                await (prisma as any).noPrefixUser.create({
                    data: {
                        userId: user.id,
                        username: user.tag
                    }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully added **${user.tag}** to no-prefix list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (subcommand === 'remove') {
                const user = interaction.options.getUser('user', true);

                
                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (!existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} **${user.tag}** is not in the no-prefix list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                await (prisma as any).noPrefixUser.delete({
                    where: { userId: user.id }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully removed **${user.tag}** from no-prefix list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (subcommand === 'show') {
                const npUsers = await (prisma as any).noPrefixUser.findMany();

                if (npUsers.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No users in the no-prefix list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const userList = npUsers.map((u: any, i: number) => `\`${i + 1}.\` **${u.username}** (\`${u.userId}\`)`).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('No-Prefix Users')
                    .setDescription(userList)
                    .setColor(Theme.EmbedColor)
                    .setFooter({ text: `Total: ${npUsers.length} users` })
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error: any) {
            console.error('NP command error:', error);
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} This feature requires database migration. Please run \`migration.sql\` first.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        }
    },

    async prefixRun(message: any, args: string[]) {
        if (message.author.id !== OWNER_ID) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} This command is owner only.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || !['add', 'remove', 'show'].includes(action)) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} **Invalid Usage**\n\`\`\`!np <add|remove|show> [@user]\`\`\``)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        try {
            if (action === 'add') {
                const user = message.mentions.users.first();
                if (!user) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Please mention a user to add.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.channel.send({ embeds: [embed] });
                }

                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} **${user.tag}** is already in the no-prefix list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.channel.send({ embeds: [embed] });
                }

                await (prisma as any).noPrefixUser.create({
                    data: {
                        userId: user.id,
                        username: user.tag
                    }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully added **${user.tag}** to no-prefix list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                return message.channel.send({ embeds: [embed] });

            } else if (action === 'remove') {
                const user = message.mentions.users.first();
                if (!user) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Please mention a user to remove.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.channel.send({ embeds: [embed] });
                }

                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (!existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} **${user.tag}** is not in the no-prefix list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.channel.send({ embeds: [embed] });
                }

                await (prisma as any).noPrefixUser.delete({
                    where: { userId: user.id }
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully removed **${user.tag}** from no-prefix list.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                return message.channel.send({ embeds: [embed] });

            } else if (action === 'show') {
                const npUsers = await (prisma as any).noPrefixUser.findMany();

                if (npUsers.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No users in the no-prefix list.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    return message.channel.send({ embeds: [embed] });
                }

                const userList = npUsers.map((u: any, i: number) => `\`${i + 1}.\` **${u.username}** (\`${u.userId}\`)`).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('No-Prefix Users')
                    .setDescription(userList)
                    .setColor(Theme.EmbedColor)
                    .setFooter({ text: `Total: ${npUsers.length} users` })
                    .setTimestamp();
                return message.channel.send({ embeds: [embed] });
            }
        } catch (error: any) {
            console.error('NP command error:', error);
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} This feature requires database migration. Please run \`migration.sql\` first.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }
    }
};
