import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const OWNER_ID = '929297205796417597';

export default {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate JavaScript code (Owner only)')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('The code to evaluate')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: `${Emojis.CROSS} This command is owner only.`, ephemeral: true });
        }

        const code = interaction.options.getString('code', true);

        try {
            await interaction.deferReply({ ephemeral: true });

            let evaled = eval(code);

            if (typeof evaled !== 'string') {
                evaled = require('util').inspect(evaled, { depth: 0 });
            }

            
            if (evaled.length > 1900) {
                evaled = evaled.substring(0, 1900) + '...';
            }

            const embed = new EmbedBuilder()
                .setTitle('Eval Result')
                .setDescription(`\`\`\`js\n${evaled}\n\`\`\``)
                .setColor(Theme.EmbedColor)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
            const embed = new EmbedBuilder()
                .setTitle('Eval Error')
                .setDescription(`\`\`\`js\n${error.message || error}\n\`\`\``)
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async prefixRun(message: any, args: string[]) {
        if (message.author.id !== OWNER_ID) {
            return message.reply(`${Emojis.CROSS} This command is owner only.`);
        }

        const code = args.join(' ');

        if (!code) {
            return message.reply(`${Emojis.CROSS} Please provide code to evaluate.`);
        }

        try {
            let evaled = eval(code);

            if (typeof evaled !== 'string') {
                evaled = require('util').inspect(evaled, { depth: 0 });
            }

            
            if (evaled.length > 1900) {
                evaled = evaled.substring(0, 1900) + '...';
            }

            const embed = new EmbedBuilder()
                .setTitle('Eval Result')
                .setDescription(`\`\`\`js\n${evaled}\n\`\`\``)
                .setColor(Theme.EmbedColor)
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error: any) {
            const embed = new EmbedBuilder()
                .setTitle('Eval Error')
                .setDescription(`\`\`\`js\n${error.message || error}\n\`\`\``)
                .setColor(0xFF0000)
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        }
    }
};
