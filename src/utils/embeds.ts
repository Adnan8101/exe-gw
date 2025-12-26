import { EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Giveaway } from '@prisma/client';
import { Theme } from './theme';

export function createGiveawayEmbed(g: Giveaway, participantCount: number): EmbedBuilder {
    const endTimeUnix = Math.floor(Number(g.endTime) / 1000);

    let description = `**Winners:** ${g.winnersCount}\n**Hosted By:** <@${g.hostId}>\n**Ends:** <t:${endTimeUnix}:R> (<t:${endTimeUnix}:f>)`;

    const reqs: string[] = [];

    if (g.roleRequirement) {
        reqs.push(`<a:yellowDot:1454035275708895336> **Required Role:** <@&${g.roleRequirement}>`);
    }
    if (g.inviteRequirement > 0) {
        reqs.push(`<a:yellowDot:1454035275708895336> **Invites:** ${g.inviteRequirement}+`);
    }
    if (g.accountAgeRequirement > 0) {
        reqs.push(`<a:yellowDot:1454035275708895336> **Account Age:** ${g.accountAgeRequirement}+ days`);
    }
    if (g.serverAgeRequirement > 0) {
        reqs.push(`<a:yellowDot:1454035275708895336> **Server Age:** ${g.serverAgeRequirement}+ days`);
    }
    if (g.messageRequired > 0) {
        reqs.push(`<a:yellowDot:1454035275708895336> **Messages:** ${g.messageRequired}+`);
    }
    if (g.voiceRequirement > 0) {
        reqs.push(`<a:yellowDot:1454035275708895336> **Voice Time:** ${g.voiceRequirement}+ mins`);
    }
    if (g.captchaRequirement) {
        reqs.push("<a:yellowDot:1454035275708895336> **Captcha Verification**");
    }

    if (reqs.length > 0) {
        description += "\n\n**Requirements:**\n" + reqs.join("\n");
    }

    description += `\n\nReact with ${g.emoji} to enter!`;

    const embed = new EmbedBuilder()
        .setTitle(g.prize)
        .setDescription(description)
        .setColor(Theme.EmbedColor)
        .setFooter({ text: `${participantCount} Participants` })
        .setTimestamp();

    if (g.thumbnail) {
        embed.setThumbnail(g.thumbnail);
    }

    return embed;
}

export function createGiveawayButton(giveawayId: number): ButtonBuilder {
    return new ButtonBuilder()
        .setLabel("Enter Giveaway")
        .setStyle(ButtonStyle.Success)
        .setCustomId(`enter_giveaway_${giveawayId}`)
        .setEmoji("🎉");
}

export function giveawayEndedEmbed(g: Giveaway, winners: string[]): EmbedBuilder {
    const winnerMentions = winners.length > 0 ? winners.map(id => `<@${id}>`).join(", ") : "No valid entrants";

    return new EmbedBuilder()
        .setTitle("Giveaway Ended")
        .setDescription(`**Prize:** ${g.prize}\n**Winners:** ${winnerMentions}\n**Hosted By:** <@${g.hostId}>`)
        .setColor(Theme.EmbedColor)
        .setFooter({ text: "Ended" })
        .setTimestamp();
}

export function giveawayCancelledEmbed(g: Giveaway): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("Giveaway Cancelled")
        .setDescription(`**Prize:** ${g.prize}\n\nThis giveaway was cancelled by a host.`)
        .setColor(Theme.EmbedColor)
        .setFooter({ text: "Cancelled" });
}
