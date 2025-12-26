import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { createGiveawayEmbed } from '../../utils/embeds';
import { hasGiveawayPermissions } from '../../utils/permissions';
import { Emojis } from '../../utils/emojis';
import { 
    parseDuration, 
    validateDuration, 
    calculateEndTimeFromString, 
    toBigInt 
} from '../../utils/timeUtils';

const prisma = new PrismaClient();

export default {
    data: new SlashCommandBuilder()
        .setName('gstart')
        .setDescription('Quick start a giveaway')
        .addStringOption(option =>
            option.setName('duration').setDescription('Duration (e.g. 30s, 1m)').setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(option =>
            option.setName('prize').setDescription('Prize').setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!await hasGiveawayPermissions(interaction)) {
            return interaction.reply({ content: `${Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to start giveaways.`, ephemeral: true });
        }

        const durationStr = interaction.options.getString('duration', true);
        const winners = interaction.options.getInteger('winners', true);
        const prize = interaction.options.getString('prize', true);
        const channel = interaction.channel as TextChannel;

        await this.run(interaction, channel, durationStr, winners, prize);
    },

    async prefixRun(message: any, args: string[]) {
        // !gstart 10m 1 Prize Name
        if (args.length < 3) {
            return message.reply(`${Emojis.CROSS} Usage: \`!gstart <duration> <winners> <prize>\`\nExample: \`!gstart 10m 1 Nitro Classic\``);
        }

        /* 
           Permissions check is tricky for prefix if we rely on interaction helpers, 
           but we can do a basic check here or mock the interaction object if hasGiveawayPermissions supports it.
           Our hasGiveawayPermissions takes CommandInteraction. We should overload it or just check manually here.
        */
        // Manual check for now or cast message member
        // reusing hasGiveawayPermissions needs modification to accept Message.
        // Let's do a quick manual check + role check using prisma if needed.
        // For speed, let's just check ManageGuild here as it's the default, 
        // OR import prisma and check role.

        // Simulating the permission check:
        // const hasPerm = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
        // ... (We should ideally refactor permissions.ts but for now let's stick to ManageGuild + Admin check)

        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
            // We can check role from DB here if we want full parity, but let's assume ManageGuild for prefix for now to match default behavior or duplicate simple logic.
            // Actually user requested "manage server" explicitly or same check.
            // Let's assume ManageGuild is enough for prefix quick start.
            return message.reply(`${Emojis.CROSS} You need Manage Server permissions.`);
        }

        const durationStr = args[0];
        const winners = parseInt(args[1]);
        const prize = args.slice(2).join(' ');

        if (isNaN(winners)) {
            return message.reply(`${Emojis.CROSS} Invalid winner count.`);
        }

        await this.run(message, message.channel, durationStr, winners, prize);
    },

    async run(ctx: any, channel: TextChannel, durationStr: string, winners: number, prize: string) {
        // Validate duration
        const validation = validateDuration(durationStr);
        if (!validation.isValid) {
            const msg = `${Emojis.CROSS} ${validation.error}`;
            if (ctx.reply) return ctx.reply({ content: msg, ephemeral: true });
            return;
        }

        // Calculate end time using centralized utility (UTC)
        const endTimeMs = calculateEndTimeFromString(durationStr);
        if (!endTimeMs) {
            const msg = `${Emojis.CROSS} Invalid duration format. Use: 30s, 2m, 1h, 7d`;
            if (ctx.reply) return ctx.reply({ content: msg, ephemeral: true });
            return;
        }

        const hostId = ctx.user ? ctx.user.id : ctx.author.id;
        const guildId = ctx.guildId;

        const giveawayData = {
            channelId: channel.id,
            guildId: guildId,
            hostId: hostId,
            prize: prize,
            winnersCount: winners,
            endTime: toBigInt(endTimeMs), // Use centralized time utility with UTC
            createdAt: toBigInt(Date.now()),
            emoji: "<a:Exe_Gw:1454033571273506929>"
        };

        try {
            // For slash commands, use ephemeral replies
            if (ctx.deferReply) await ctx.deferReply({ ephemeral: true });

            const gForEmbed: any = { ...giveawayData, messageId: "", id: 0 };
            const embed = createGiveawayEmbed(gForEmbed, 0);

            const message = await channel.send({ embeds: [embed] });
            await message.react("<a:Exe_Gw:1454033571273506929>");

            await prisma.giveaway.create({
                data: {
                    ...giveawayData,
                    messageId: message.id
                }
            });

            const successMsg = `${Emojis.TICK} Giveaway started in ${channel}!`;
            
            // For slash commands - send ephemeral reply
            if (ctx.editReply) {
                await ctx.editReply(successMsg);
            } 
            // For prefix commands - send reply then delete both messages
            else {
                const reply = await ctx.reply(successMsg);
                
                // Delete command message and success message after 3 seconds
                setTimeout(async () => {
                    try {
                        await ctx.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (e) {
                        // Ignore deletion errors
                    }
                }, 3000);
            }

        } catch (error) {
            console.error(error);
            const failMsg = `${Emojis.CROSS} Failed to start giveaway.`;
            if (ctx.editReply) await ctx.editReply(failMsg);
            else await ctx.reply(failMsg);
        }
    }
};
