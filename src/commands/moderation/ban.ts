import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasBanPermission } from '../../utils/moderationUtils';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
 data: {
 name: 'ban',
 description: 'Ban a member from the server',
 category: 'moderation',
 syntax: '!ban <user> [reason]',
 example: '!ban @User Raid attempt',
 permissions: ['BanMembers']
 },

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!hasBanPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Ban Members** permission`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Ban Members** permission`)
 ]});
 }

    // Try to get member from server first
    const targetMember = message.mentions.members?.first() || 
      await message.guild.members.fetch(args[0]).catch(() => null);

    // If member not in server, try to fetch user by ID (hackban)
    let targetUser;
    let userId = args[0];

    if (targetMember) {
      targetUser = targetMember.user;
      userId = targetMember.id;

      // Only check role hierarchy if user is in server
      if (!canModerate(message.member, targetMember)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} Cannot ban this member (higher or equal role)`)
        ]});
      }

      if (!canModerate(message.guild.members.me!, targetMember)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} I cannot ban this member (higher or equal role)`)
        ]});
      }
    } else {
      // Try to fetch user by ID for hackban
      if (message.mentions.users.first()) {
        targetUser = message.mentions.users.first()!;
        userId = targetUser.id;
      } else {
        try {
          targetUser = await message.client.users.fetch(userId);
        } catch (error) {
          return message.reply({ embeds: [new EmbedBuilder()
            .setColor(Theme.ErrorColor)
            .setDescription(`${Emojis.CROSS} Please provide a valid user mention or ID`)
          ]});
        }
      }
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    const caseId = await createModCase(message.guild.id, {
      action: 'ban',
      targetId: userId,
      targetTag: targetUser.tag,
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      reason
    });

    // Try to DM user if they're in server
    if (targetMember) {
      try {
        const dmEmbed = createDMEmbed('ban', message.guild, reason);
        await targetMember.send({ embeds: [dmEmbed] });
      } catch (error) {}
    }

    try {
      await message.guild.members.ban(userId, { reason });
    } catch (error) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Failed to ban user`)
      ]});
    }

    const embed = createModEmbed('ban', targetUser, message.author, reason, caseId);
    await message.reply({ embeds: [embed] });
  }
};