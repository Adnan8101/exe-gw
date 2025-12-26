"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const theme_1 = require("../../utils/theme");
const emojis_1 = require("../../utils/emojis");
const prisma = new client_1.PrismaClient();
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('bsetting')
        .setDescription('Configure Birthday Settings')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addRoleOption(option => option.setName('role').setDescription('Role to give to the birthday user').setRequired(true))
        .addRoleOption(option => option.setName('ping_role').setDescription('Role to ping in the announcement').setRequired(true)),
    async execute(interaction) {
        const role = interaction.options.getRole('role', true);
        const pingRole = interaction.options.getRole('ping_role', true);
        await this.run(interaction, role, pingRole);
    },
    async prefixRun(message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
            return message.reply({ content: `${emojis_1.Emojis.CROSS} You need Manage Server permissions.` });
        }
        const role = message.mentions.roles.first();
        const pingRole = message.mentions.roles.last(); // Simple assumption if 2 roles mentioned
        if (!role || !pingRole || message.mentions.roles.size < 2) {
            return message.reply(`${emojis_1.Emojis.CROSS} Usage: \`!bsetting @BirthdayRole @PingRole\``);
        }
        await this.run(message, role, pingRole);
    },
    async run(ctx, role, pingRole) {
        const guildId = ctx.guildId;
        const user = (ctx instanceof discord_js_1.Message) ? ctx.author : ctx.user;
        // 1. Initial Embed (Roles Set)
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🎂 Birthday Configuration')
            .setDescription(`${emojis_1.Emojis.TICK} **Roles Configured!**\n\n**Birthday Role:** ${role}\n**Ping Role:** ${pingRole}\n\nClick the button below to set the **Birthday Message**.`)
            .setColor(theme_1.Theme.EmbedColor);
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('set_bday_msg')
            .setLabel('Set Birthday Message')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('📝'));
        // Save Roles Immediately (Upsert)
        await prisma.birthdayConfig.upsert({
            where: { guildId },
            update: { birthdayRole: role.id, pingRole: pingRole.id },
            create: { guildId, birthdayRole: role.id, pingRole: pingRole.id }
        });
        const response = (ctx instanceof discord_js_1.Message)
            ? await ctx.reply({ embeds: [embed], components: [row] })
            : await ctx.reply({ embeds: [embed], components: [row], fetchReply: true });
        // 2. Collector for "Set Message" Button
        const collector = response.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 600000 // 10 minutes total session
        });
        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) {
                await i.reply({ content: `${emojis_1.Emojis.CROSS} only the command user can use this.`, ephemeral: true });
                return;
            }
            if (i.customId === 'set_bday_msg') {
                const original = (ctx instanceof discord_js_1.Message) ? undefined : ctx; // If prefix, no original interaction to fully mimic context but we pass what we can
                // Actually handleMessageInput expects ChatInputCommandInteraction | undefined for updates?
                // Refactor handleMessageInput to handle both contexts? 
                // It mostly uses `i` (ButtonInteraction), so `originalInteraction` is just for `guildId`.
                // We'll pass a mock or modify method signature.
                // Let's modify handleMessageInput signature slightly to accept GuildId directly or just use i.guildId
                await this.handleMessageInput(i, guildId);
            }
        });
    },
    async handleMessageInput(i, guildId) {
        // Show Prompt
        const promptEmbed = new discord_js_1.EmbedBuilder()
            .setTitle('📝 Set Birthday Message')
            .setDescription(`Please enter your custom birthday message below.\nYou have **10 minutes**.\n\n**Samples:**\n\`Happy Birthday {user}! Have a blast! 🎉\`\n\`Wishing the happiest of birthdays to {user}! 🎂\`\n\n*Note: {user} will be replaced with the user mention.*`)
            .setColor(theme_1.Theme.EmbedColor);
        await i.update({ embeds: [promptEmbed], components: [] });
        // Message Collector
        const filter = (m) => m.author.id === i.user.id;
        const channel = i.channel;
        const msgCollector = channel?.createMessageCollector({ filter, time: 600000, max: 1 });
        if (!msgCollector)
            return;
        msgCollector.on('collect', async (m) => {
            const content = m.content;
            await m.delete().catch(() => { }); // cleanup user message
            // Show Preview
            const previewEmbed = new discord_js_1.EmbedBuilder()
                .setTitle('👀 Message Preview')
                .setDescription(`**Message:**\n${content}\n\n**Preview:**\n${content.replace(/{user}/g, i.user.toString())}`)
                .setColor(theme_1.Theme.EmbedColor);
            const row = new discord_js_1.ActionRowBuilder()
                .addComponents(new discord_js_1.ButtonBuilder().setCustomId('save_msg').setLabel('Save').setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji('💾'), new discord_js_1.ButtonBuilder().setCustomId('edit_msg').setLabel('Edit').setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji('✏️'), new discord_js_1.ButtonBuilder().setCustomId('cancel_msg').setLabel('Cancel').setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji('❌'));
            const previewMsg = await i.editReply({ embeds: [previewEmbed], components: [row] });
            // Button Collector for Preview Actions
            try {
                const selection = await previewMsg.awaitMessageComponent({ filter: (btn) => btn.user.id === i.user.id, time: 60000 });
                if (selection.customId === 'save_msg') {
                    await prisma.birthdayConfig.update({
                        where: { guildId: guildId },
                        data: { message: content }
                    });
                    await selection.update({ content: `${emojis_1.Emojis.TICK} **Birthday Configuration Saved!**`, embeds: [], components: [] });
                }
                else if (selection.customId === 'edit_msg') {
                    // Loop back
                    this.handleMessageInput(selection, guildId);
                }
                else {
                    await selection.update({ content: `${emojis_1.Emojis.CROSS} **Cancelled.**`, embeds: [], components: [] });
                }
            }
            catch (e) {
                await i.editReply({ content: '❌ Timed out.', components: [] });
            }
        });
    }
};
