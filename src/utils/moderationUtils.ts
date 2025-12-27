import { Guild, GuildMember, User, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { prisma } from './database';
import { nanoid } from 'nanoid';
import { Theme } from './theme';

export interface ModerationAction {
  action: string;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string;
  duration?: number;
  silent?: boolean;
}

export async function createModCase(
  guildId: string,
  data: ModerationAction
): Promise<string> {
  const caseId = `${guildId.slice(-4)}-${nanoid(8)}`;
  
  await prisma.moderationCase.create({
    data: {
      caseId,
      guildId,
      targetId: data.targetId,
      targetTag: data.targetTag,
      moderatorId: data.moderatorId,
      moderatorTag: data.moderatorTag,
      action: data.action,
      reason: data.reason || 'No reason provided',
      duration: data.duration ? BigInt(data.duration) : null,
      silent: data.silent || false,
      expiresAt: data.duration ? new Date(Date.now() + data.duration) : null
    }
  });

  return caseId;
}

export function canModerate(moderator: GuildMember, target: GuildMember): boolean {
  if (target.guild.ownerId === target.id) {
    return false;
  }
  
  if (moderator.guild.ownerId === moderator.id) {
    return true;
  }
  
  if (moderator.roles.highest.position <= target.roles.highest.position) {
    return false;
  }
  
  return true;
}

export function createModEmbed(
  action: string,
  target: User,
  moderator: User,
  reason: string,
  caseId: string,
  duration?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Theme.SuccessColor)
    .setTitle(`✓ ${capitalizeFirst(action)} Successful`)
    .addFields(
      { name: 'User', value: `${target.tag}\n\`${target.id}\``, inline: true },
      { name: 'Moderator', value: moderator.tag, inline: true },
      { name: 'Reason', value: reason || 'No reason provided' }
    )
    .setFooter({ text: `Case ID: ${caseId}` })
    .setTimestamp();

  if (duration) {
    embed.addFields({ name: 'Duration', value: duration, inline: true });
  }

  return embed;
}

export function createDMEmbed(
  action: string,
  guild: Guild,
  reason: string,
  duration?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Theme.ErrorColor)
    .setTitle(`You have been ${action}ed from ${guild.name}`)
    .addFields({ name: 'Reason', value: reason || 'No reason provided' })
    .setTimestamp();

  if (duration) {
    embed.addFields({ name: 'Duration', value: duration });
  }

  return embed;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseDuration(duration: string): number | null {
  const regex = /^(\d+)([smhdw])$/;
  const match = duration.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: { [key: string]: number } = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 604800000
  };
  
  return value * multipliers[unit];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function hasModPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

export function hasKickPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.KickMembers);
}

export function hasBanPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.BanMembers);
}

export function hasManageRolesPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageRoles);
}
