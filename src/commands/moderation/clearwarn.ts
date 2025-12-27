import { Message, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { prisma } from '../../utils/database';

export default {
  data: new SlashCommandBuilder()
    .setName('clearwarn')
    .setDescription('Clear a specific warning by case ID')
    .addStringOption(option => option.setName('caseid').setDescription('The case ID of the warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  metadata: {
    syntax: '!clearwarn <case_id>',
    example: '!clearwarn 1234-abc123',
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

    // Find the warning
    const warning = await prisma.warning.findFirst({
      where: { 
        caseId,
        guildId: message.guild.id
      }
    });

    if (!warning) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Warning not found`)
      ]});
    }

    // Delete the warning
    await prisma.warning.delete({
      where: { id: warning.id }
    });

    // Also delete the moderation case
    await prisma.moderationCase.deleteMany({
      where: { caseId }
    });

    const embed = new EmbedBuilder()
      .setColor(Theme.SuccessColor)
      .setDescription(`${Emojis.TICK} Warning **${caseId}** cleared`)
      .setFooter({ text: `By ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
