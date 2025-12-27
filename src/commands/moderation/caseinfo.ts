import { 
  Message, 
  EmbedBuilder, 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed, createCommandHelpEmbed } from '../../utils/commandHelp';
import { hasModPermission, canModerate, formatDuration } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';

export default {
  data: new SlashCommandBuilder()
    .setName('caseinfo')
    .setDescription('View detailed information about a moderation case')
    .addStringOption(option => 
      option.setName('case_id')
        .setDescription('The case ID to view')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  metadata: {
    syntax: '!caseinfo <case_id>',
    example: '!caseinfo 1234-abcd5678',
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
      mentions: {
        members: new Map(),
        channels: new Map(),
        roles: new Map()
      },
      reply: async (options: any) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(options);
        }
        return interaction.reply(options);
      }
    };
    
    return this._sharedLogic(message as Message, args);
  },

  async prefixRun(message: Message, args: string[]) {
    return this._sharedLogic(message, args);
  },

  async _sharedLogic(message: Message, args: string[]) {
    // Validate required arguments - show help embed if missing
    if (args.length < 1) {
      const commandData = {
        name: 'caseinfo',
        description: 'View detailed information about a moderation case',
        metadata: this.metadata
      };
      return message.reply({ embeds: [createMissingArgsEmbed(commandData, 'case_id')] });
    }

    if (!message.guild || !message.member) return;

    if (!hasModPermission(message.member)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} You need **Moderate Members** permission to use this command`)
      ]});
    }

    const caseId = args[0];

    // Fetch the case from the database
    const caseData = await prisma.moderationCase.findUnique({
      where: { caseId }
    });

    if (!caseData) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Case with ID \`${caseId}\` not found`)
      ]});
    }

    // Check if the case belongs to this guild
    if (caseData.guildId !== message.guild.id) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} This case does not belong to this server`)
      ]});
    }

    // Create the embed with case information
    const embed = new EmbedBuilder()
      .setColor(Theme.EmbedColor)
      .setTitle(`📋 Case Information: ${caseData.caseId}`)
      .addFields(
        { name: '👤 Target', value: `${caseData.targetTag} (\`${caseData.targetId}\`)`, inline: true },
        { name: '👮 Moderator', value: `${caseData.moderatorTag} (\`${caseData.moderatorId}\`)`, inline: true },
        { name: '⚡ Action', value: caseData.action.toUpperCase(), inline: true },
        { name: '📝 Reason', value: caseData.reason || 'No reason provided', inline: false }
      )
      .setTimestamp(caseData.createdAt);

    // Add duration if it exists
    if (caseData.duration) {
      const durationMs = Number(caseData.duration);
      embed.addFields({ 
        name: '⏱️ Duration', 
        value: formatDuration(durationMs), 
        inline: true 
      });
    }

    // Add expiry time if it exists
    if (caseData.expiresAt) {
      embed.addFields({ 
        name: '⏰ Expires At', 
        value: `<t:${Math.floor(caseData.expiresAt.getTime() / 1000)}:F>`, 
        inline: true 
      });
    }

    // Add silent flag
    embed.addFields({ 
      name: '🔇 Silent', 
      value: caseData.silent ? 'Yes' : 'No', 
      inline: true 
    });

    // Create action buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`case_ban_${caseData.targetId}_${caseData.caseId}`)
          .setLabel('Ban')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔨'),
        new ButtonBuilder()
          .setCustomId(`case_kick_${caseData.targetId}_${caseData.caseId}`)
          .setLabel('Kick')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('👢'),
        new ButtonBuilder()
          .setCustomId(`case_mute_${caseData.targetId}_${caseData.caseId}`)
          .setLabel('Timeout')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔇'),
        new ButtonBuilder()
          .setCustomId(`case_clear_${caseData.caseId}`)
          .setLabel('Clear Case')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🗑️')
      );

    const reply = await message.reply({ 
      embeds: [embed], 
      components: [row] 
    });

    // Create a collector for button interactions
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (interaction) => {
      // Check if the user has permission
      if (!interaction.member || !hasModPermission(interaction.member as any)) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(Theme.ErrorColor)
            .setDescription(`${Emojis.CROSS} You need **Moderate Members** permission to use these buttons`)
          ],
          ephemeral: true
        });
      }

      const [action, type, targetId, caseIdFromButton] = interaction.customId.split('_');

      if (action === 'case') {
        if (type === 'clear') {
          // Delete the case
          await prisma.moderationCase.delete({
            where: { caseId: targetId }
          });

          await interaction.update({
            embeds: [new EmbedBuilder()
              .setColor(Theme.SuccessColor)
              .setDescription(`${Emojis.TICK} Case \`${targetId}\` has been cleared`)
            ],
            components: []
          });
        } else {
          // For ban, kick, mute actions
          const member = await message.guild!.members.fetch(targetId).catch(() => null);
          
          if (!member) {
            return interaction.reply({
              embeds: [new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} User is not in the server`)
              ],
              ephemeral: true
            });
          }

          // Check hierarchy
          if (!canModerate(interaction.member as any, member)) {
            return interaction.reply({
              embeds: [new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} You cannot moderate this member (higher or equal role)`)
              ],
              ephemeral: true
            });
          }

          try {
            if (type === 'ban') {
              await member.ban({ reason: `Action from case: ${caseIdFromButton}` });
              await interaction.update({
                embeds: [new EmbedBuilder()
                  .setColor(Theme.SuccessColor)
                  .setDescription(`${Emojis.TICK} Successfully banned ${member.user.tag}`)
                ],
                components: []
              });
            } else if (type === 'kick') {
              await member.kick(`Action from case: ${caseIdFromButton}`);
              await interaction.update({
                embeds: [new EmbedBuilder()
                  .setColor(Theme.SuccessColor)
                  .setDescription(`${Emojis.TICK} Successfully kicked ${member.user.tag}`)
                ],
                components: []
              });
            } else if (type === 'mute') {
              await member.timeout(3600000, `Action from case: ${caseIdFromButton}`); // 1 hour timeout
              await interaction.update({
                embeds: [new EmbedBuilder()
                  .setColor(Theme.SuccessColor)
                  .setDescription(`${Emojis.TICK} Successfully timed out ${member.user.tag} for 1 hour`)
                ],
                components: []
              });
            }
          } catch (error) {
            return interaction.reply({
              embeds: [new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to execute action: ${error}`)
              ],
              ephemeral: true
            });
          }
        }
      }
    });

    collector.on('end', () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  }
};
