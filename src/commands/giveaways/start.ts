import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { createGiveawayEmbed } from '../../utils/embeds';
import { hasGiveawayPermissions, hasGiveawayPermissionsMessage } from '../../utils/permissions';
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
        .setDescription('Quick start a giveaway - Prize, Winners, Duration')
        .addStringOption(option =>
            option.setName('prize').setDescription('Prize to give away').setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(option =>
            option.setName('duration').setDescription('Duration (e.g. 30s, 1m, 1h)').setRequired(true)),

    requiresPermissions: true,
    
    async checkPermissions(message: any): Promise<boolean> {
        return await hasGiveawayPermissionsMessage(message);
    },

    async execute(interaction: ChatInputCommandInteraction) {
        if (!await hasGiveawayPermissions(interaction)) {
            return interaction.reply({ content: `${Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to start giveaways.`, ephemeral: true });
        }

        const prize = interaction.options.getString('prize', true);
        const winners = interaction.options.getInteger('winners', true);
        const durationStr = interaction.options.getString('duration', true);
        const channel = interaction.channel as TextChannel;

        await this.run(interaction, channel, durationStr, winners, prize);
    },

    async prefixRun(message: any, args: string[]) {
        
        if (args.length < 3) {
            return message.reply(`${Emojis.CROSS} Usage: \`!gstart <prize> <winners> <duration>\`\nExample: \`!gstart "Nitro Classic" 1 10m\``);
        }

        
        let prize: string;
        let winners: number;
        let durationStr: string;

        
        if (args[0].startsWith('"') || args[0].startsWith("'")) {
            
            const quoteChar = args[0][0];
            let prizeEnd = 0;
            let prizeStr = args[0].substring(1);
            
            for (let i = 1; i < args.length; i++) {
                if (args[i].endsWith(quoteChar)) {
                    prizeStr += ' ' + args[i].substring(0, args[i].length - 1);
                    prizeEnd = i;
                    break;
                } else {
                    prizeStr += ' ' + args[i];
                }
            }
            
            if (prizeEnd === 0) {
                prize = args.slice(0, -2).join(' ');
                winners = parseInt(args[args.length - 2]);
                durationStr = args[args.length - 1];
            } else {
                prize = prizeStr;
                winners = parseInt(args[prizeEnd + 1]);
                durationStr = args[prizeEnd + 2];
            }
        } else {
            
            durationStr = args[args.length - 1];
            winners = parseInt(args[args.length - 2]);
            prize = args.slice(0, -2).join(' ');
        }

        if (isNaN(winners)) {
            return message.reply(`${Emojis.CROSS} Invalid winner count.`);
        }

        await this.run(message, message.channel, durationStr, winners, prize);
    },

    async run(ctx: any, channel: TextChannel, durationStr: string, winners: number, prize: string) {
        
        const validation = validateDuration(durationStr);
        if (!validation.isValid) {
            const msg = `${Emojis.CROSS} ${validation.error}`;
            if (ctx.reply) return ctx.reply({ content: msg, ephemeral: true });
            return;
        }

        
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
            endTime: toBigInt(endTimeMs), 
            createdAt: toBigInt(Date.now()),
            emoji: "<a:Exe_Gw:1454033571273506929>"
        };

        try {
            
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
            
            
            if (ctx.editReply) {
                await ctx.editReply(successMsg);
            } 
            
            else {
                const reply = await ctx.reply(successMsg);
                
                
                setTimeout(async () => {
                    try {
                        await ctx.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (e) {
                        
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
