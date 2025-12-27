import { Message, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { prisma } from '../../utils/database';

export default {
  data: new SlashCommandBuilder()
    .setName('clearcase')
    .setDescription('Clear a moderation case')
    .addStringOption(option => option.setName('caseid').setDescription('The case ID to clear').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  metadata: {
    syntax: '!clearcase <case_id>',
    example: '!clearcase 1234-abc123',
    permissions: 'Moderate Members',
    category: 'Moderation'
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const args: string[] = [];
    
    if (interaction.options.data) {
      for (const opt of interaction.options.data) {
        if (opt.value !== undefined) {
          args.push(String(opt.value));
        }
      }
    }
    
    const message: any = {
      guild: interaction.guild,
      member: interaction.member,
      author: interaction.user,
      channel: interaction.channel,
      reply: async (options: any) => {
        return interaction.reply({ ...options, ephemeral: true });
      }
    };

    await this.prefixRun(message, args);
  },

  async prefixRun(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;

    const caseId = args[0];

    if (!caseId) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Please provide a case ID`)
      ]});
    }

    // Find the case
    const modCase = await prisma.moderationCase.findUnique({
      where: { caseId }
    });

    if (!modCase) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Case not found`)
      ]});
    }

    if (modCase.guildId !== message.guild.id) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Case not found in this server`)
      ]});
    }

    // Delete the case
    await prisma.moderationCase.delete({
      where: { caseId }
    });

    // If it was a warning, also delete the warning entry
    if (modCase.action === 'warn') {
      await prisma.warning.deleteMany({
        where: { caseId }
      });
    }

    const embed = new EmbedBuilder()
      .setColor(Theme.SuccessColor)
      .setDescription(`${Emojis.TICK} Case **${caseId}** cleared`)
      .setFooter({ text: `By ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
