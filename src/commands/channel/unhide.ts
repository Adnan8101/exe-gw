import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel, SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('unhide')
    .setDescription('Unhide a channel')
    .addChannelOption(option => option.setName("channel").setDescription("The channel to unhide (defaults to current)").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  metadata: {
    syntax: '!unhide [#channel]',
    example: '!unhide #general',
    permissions: 'Manage Channels',
    category: 'Channel Management'
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const args: string[] = [];
    
    if (interaction.options.data) {
      for (const opt of interaction.options.data) {
        if (opt.channel) {
          args.push(opt.channel.id);
        }
      }
    }
    
    const message: any = {
      guild: interaction.guild,
      member: interaction.member,
      author: interaction.user,
      channel: interaction.channel,
      mentions: {
        channels: interaction.options.getChannel('channel') ? 
          new Map(interaction.options.getChannel('channel') ? [[interaction.options.getChannel('channel')!.id, interaction.options.getChannel('channel')]] : []) : 
          new Map()
      },
      reply: async (options: any) => {
        return interaction.reply({ ...options, ephemeral: true });
      }
    };

    await this.prefixRun(message, args);
  },

  async prefixRun(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;

    // Check user permissions
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} You need **Manage Channels** permission to use this command`)
      ]});
    }

    // Check bot permissions
    if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} I need **Manage Channels** permission to execute this command`)
      ]});
    }

    // Get target channel
    let channel = message.mentions.channels.first() || 
                  (args[0] ? message.guild.channels.cache.get(args[0]) : null) ||
                  message.channel;

    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Invalid channel`)
      ]});
    }

    const everyoneRole = message.guild.roles.everyone;

    try {
      await (channel as TextChannel).permissionOverwrites.edit(everyoneRole, {
        ViewChannel: null
      });

      const embed = new EmbedBuilder()
        .setColor(Theme.SuccessColor)
        .setDescription(`${Emojis.TICK} Unhidden ${channel}`)
        .setFooter({ text: `Mod: ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Failed to unhide channel`)
      ]});
    }
  }
};
