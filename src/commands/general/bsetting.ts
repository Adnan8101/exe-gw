import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ComponentType,
    ButtonInteraction,
    Message,
    TextChannel,
    Guild
} from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const prisma = new PrismaClient();

/**
 * Check if a role can be assigned by the bot (role hierarchy check)
 */
async function canAssignRole(guild: Guild, roleId: string): Promise<{ canAssign: boolean; reason?: string }> {
    try {
        const role = await guild.roles.fetch(roleId);
        if (!role) {
            return { canAssign: false, reason: 'Role not found' };
        }

        const botMember = guild.members.me;
        if (!botMember) {
            return { canAssign: false, reason: 'Bot member not found' };
        }

        const botHighestRole = botMember.roles.highest;
        if (role.position >= botHighestRole.position) {
            return { canAssign: false, reason: `The role **${role.name}** is above or equal to my highest role. I cannot assign/remove it.` };
        }

        if (!botMember.permissions.has('ManageRoles')) {
            return { canAssign: false, reason: 'I don\'t have the Manage Roles permission.' };
        }

        return { canAssign: true };
    } catch (e) {
        return { canAssign: false, reason: 'Failed to check role permissions' };
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('bsetting')
        .setDescription('Configure Birthday Settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(option =>
            option.setName('role').setDescription('Role to give to the birthday user').setRequired(true))
        .addRoleOption(option =>
            option.setName('ping_role').setDescription('Role to ping in the announcement').setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const role = interaction.options.getRole('role', true);
        const pingRole = interaction.options.getRole('ping_role', true);
        
        
        const roleCheck = await canAssignRole(interaction.guild!, role.id);
        if (!roleCheck.canAssign) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(`${Emojis.CROSS} Role Hierarchy Error`)
                .setDescription(`**Cannot configure birthday role:**\n${roleCheck.reason}\n\nPlease move my role above the birthday role in Server Settings > Roles.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        await this.run(interaction, role, pingRole);
    },

    async prefixRun(message: Message, args: string[]) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply({ content: `${Emojis.CROSS} You need Manage Server permissions.` });
        }

        const role = message.mentions.roles.first();
        const pingRole = message.mentions.roles.last(); 

        if (!role || !pingRole || message.mentions.roles.size < 2) {
            const usageEmbed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} **Invalid Usage**\n\nUsage: \`!bsetting @BirthdayRole @PingRole\`\n\nExample: \`!bsetting @Birthday @everyone\``)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.reply({ embeds: [usageEmbed] });
        }

        
        const roleCheck = await canAssignRole(message.guild!, role.id);
        if (!roleCheck.canAssign) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(`${Emojis.CROSS} Role Hierarchy Error`)
                .setDescription(`**Cannot configure birthday role:**\n${roleCheck.reason}\n\nPlease move my role above the birthday role in Server Settings > Roles.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }

        await this.run(message, role, pingRole);
    },

    async run(ctx: ChatInputCommandInteraction | Message, role: any, pingRole: any) {
        const guildId = ctx.guildId!;
        const user = (ctx instanceof Message) ? ctx.author : ctx.user;

        
        const embed = new EmbedBuilder()
            .setTitle('🎂 Birthday Configuration')
            .setDescription(`${Emojis.TICK} **Roles Configured!**\n\n**Birthday Role:** ${role}\n**Ping Role:** ${pingRole}\n\nClick the button below to set the **Birthday Message**.`)
            .setColor(Theme.EmbedColor);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_bday_msg')
                    .setLabel('Set Birthday Message')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝')
            );

        
        await prisma.birthdayConfig.upsert({
            where: { guildId },
            update: { birthdayRole: role.id, pingRole: pingRole.id },
            create: { guildId, birthdayRole: role.id, pingRole: pingRole.id }
        });

        const response = (ctx instanceof Message)
            ? await ctx.reply({ embeds: [embed], components: [row] })
            : await ctx.reply({ embeds: [embed], components: [row], fetchReply: true });

        
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000 
        });

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.user.id !== user.id) {
                await i.reply({ content: `${Emojis.CROSS} only the command user can use this.`, ephemeral: true });
                return;
            }

            if (i.customId === 'set_bday_msg') {
                const original = (ctx instanceof Message) ? undefined : ctx; 
                
                
                
                

                
                await this.handleMessageInput(i, guildId);
            }
        });
    },

    async handleMessageInput(i: ButtonInteraction, guildId: string) {
        
        const promptEmbed = new EmbedBuilder()
            .setTitle('📝 Set Birthday Message')
            .setDescription(`Please enter your custom birthday message below.\nYou have **10 minutes**.\n\n**Samples:**\n\`Happy Birthday {user}! Have a blast! 🎉\`\n\`Wishing the happiest of birthdays to {user}! 🎂\`\n\n*Note: {user} will be replaced with the user mention.*`)
            .setColor(Theme.EmbedColor);

        await i.update({ embeds: [promptEmbed], components: [] });

        
        const filter = (m: Message) => m.author.id === i.user.id;
        const channel = i.channel as TextChannel;
        const msgCollector = channel?.createMessageCollector({ filter, time: 600000, max: 1 });

        if (!msgCollector) return;

        msgCollector.on('collect', async (m: Message) => {
            const content = m.content;
            await m.delete().catch(() => { }); 

            
            const previewEmbed = new EmbedBuilder()
                .setTitle('👀 Message Preview')
                .setDescription(`**Message:**\n${content}\n\n**Preview:**\n${content.replace(/{user}/g, i.user.toString())}`)
                .setColor(Theme.EmbedColor);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder().setCustomId('save_msg').setLabel('Save').setStyle(ButtonStyle.Secondary).setEmoji('💾'),
                    new ButtonBuilder().setCustomId('edit_msg').setLabel('Edit').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
                    new ButtonBuilder().setCustomId('cancel_msg').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('❌')
                );

            const previewMsg = await i.editReply({ embeds: [previewEmbed], components: [row] });

            
            try {
                const selection = await previewMsg.awaitMessageComponent({ filter: (btn) => btn.user.id === i.user.id, time: 60000 });

                if (selection.customId === 'save_msg') {
                    await prisma.birthdayConfig.update({
                        where: { guildId: guildId },
                        data: { message: content }
                    });
                    await selection.update({ content: `${Emojis.TICK} **Birthday Configuration Saved!**`, embeds: [], components: [] });
                } else if (selection.customId === 'edit_msg') {
                    
                    this.handleMessageInput(selection as ButtonInteraction, guildId);
                } else {
                    await selection.update({ content: `${Emojis.CROSS} **Cancelled.**`, embeds: [], components: [] });
                }
            } catch (e) {
                await i.editReply({ content: '❌ Timed out.', components: [] });
            }
        });
    }
};
