import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const prisma = new PrismaClient();
const OWNER_ID = '929297205796417597';

export default {
    data: new SlashCommandBuilder()
        .setName('np')
        .setDescription('Manage no-prefix users (Owner only)')
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
            return interaction.reply({ content: `${Emojis.CROSS} This command is owner only.`, ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'add') {
                const user = interaction.options.getUser('user', true);

                // Check if already exists
                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (existing) {
                    return interaction.reply({ content: `${Emojis.CROSS} ${user.tag} is already in the no-prefix list.`, ephemeral: true });
                }

                await (prisma as any).noPrefixUser.create({
                    data: {
                        userId: user.id,
                        username: user.tag
                    }
                });

                return interaction.reply({ content: `${Emojis.TICK} Added ${user.tag} to no-prefix list.`, ephemeral: true });
            } else if (subcommand === 'remove') {
                const user = interaction.options.getUser('user', true);

                // Check if exists
                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (!existing) {
                    return interaction.reply({ content: `${Emojis.CROSS} ${user.tag} is not in the no-prefix list.`, ephemeral: true });
                }

                await (prisma as any).noPrefixUser.delete({
                    where: { userId: user.id }
                });

                return interaction.reply({ content: `${Emojis.TICK} Removed ${user.tag} from no-prefix list.`, ephemeral: true });
            } else if (subcommand === 'show') {
                const npUsers = await (prisma as any).noPrefixUser.findMany();

                if (npUsers.length === 0) {
                    return interaction.reply({ content: 'No users in the no-prefix list.', ephemeral: true });
                }

                const userList = npUsers.map((u: any, i: number) => `${i + 1}. ${u.username} (${u.userId})`).join('\n');

                return interaction.reply({ content: `**No-Prefix Users:**\n${userList}`, ephemeral: true });
            }
        } catch (error: any) {
            console.error('NP command error:', error);
            return interaction.reply({ 
                content: `${Emojis.CROSS} This feature requires database migration. Please run \`migration.sql\` first.`, 
                ephemeral: true 
            });
        }
    },

    async prefixRun(message: any, args: string[]) {
        if (message.author.id !== OWNER_ID) {
            return message.reply(`${Emojis.CROSS} This command is owner only.`);
        }

        const action = args[0]?.toLowerCase();

        if (!action || !['add', 'remove', 'show'].includes(action)) {
            return message.reply(`${Emojis.CROSS} Usage: \`!np <add|remove|show> [@user]\``);
        }

        try {
            if (action === 'add') {
                const user = message.mentions.users.first();
                if (!user) {
                    return message.reply(`${Emojis.CROSS} Please mention a user to add.`);
                }

                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (existing) {
                    return message.reply(`${Emojis.CROSS} ${user.tag} is already in the no-prefix list.`);
                }

                await (prisma as any).noPrefixUser.create({
                    data: {
                        userId: user.id,
                        username: user.tag
                    }
                });

                return message.reply(`${Emojis.TICK} Added ${user.tag} to no-prefix list.`);

            } else if (action === 'remove') {
                const user = message.mentions.users.first();
                if (!user) {
                    return message.reply(`${Emojis.CROSS} Please mention a user to remove.`);
                }

                const existing = await (prisma as any).noPrefixUser.findUnique({
                    where: { userId: user.id }
                });

                if (!existing) {
                    return message.reply(`${Emojis.CROSS} ${user.tag} is not in the no-prefix list.`);
                }

                await (prisma as any).noPrefixUser.delete({
                    where: { userId: user.id }
                });

                return message.reply(`${Emojis.TICK} Removed ${user.tag} from no-prefix list.`);

            } else if (action === 'show') {
                const npUsers = await (prisma as any).noPrefixUser.findMany();

                if (npUsers.length === 0) {
                    return message.reply('No users in the no-prefix list.');
                }

                const userList = npUsers.map((u: any, i: number) => `${i + 1}. ${u.username} (${u.userId})`).join('\n');

                return message.reply(`**No-Prefix Users:**\n${userList}`);
            }
        } catch (error: any) {
            console.error('NP command error:', error);
            return message.reply(`${Emojis.CROSS} This feature requires database migration. Please run \`migration.sql\` first.`);
        }
    }
};
