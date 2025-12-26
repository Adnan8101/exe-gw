"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGiveawayEmbed = createGiveawayEmbed;
exports.createGiveawayButton = createGiveawayButton;
exports.giveawayEndedEmbed = giveawayEndedEmbed;
exports.giveawayCancelledEmbed = giveawayCancelledEmbed;
const discord_js_1 = require("discord.js");
const theme_1 = require("./theme");
function createGiveawayEmbed(g, participantCount) {
    const endTimeUnix = Math.floor(Number(g.endTime) / 1000);
    let description = `**Winners:** ${g.winnersCount}\n**Hosted By:** <@${g.hostId}>\n\nEnds in: <t:${endTimeUnix}:R> (<t:${endTimeUnix}:f>)\n`;
    const reqs = [];
    if (g.roleRequirement) {
        reqs.push(`• **Required Role:** <@&${g.roleRequirement}>`);
    }
    if (g.inviteRequirement > 0) {
        reqs.push(`• **Invites:** ${g.inviteRequirement}+`);
    }
    if (g.accountAgeRequirement > 0) {
        reqs.push(`• **Account Age:** ${g.accountAgeRequirement}+ days`);
    }
    if (g.serverAgeRequirement > 0) {
        reqs.push(`• **Server Age:** ${g.serverAgeRequirement}+ days`);
    }
    if (g.messageRequired > 0) {
        reqs.push(`• **Messages:** ${g.messageRequired}+`);
    }
    if (g.voiceRequirement > 0) {
        reqs.push(`• **Voice Time:** ${g.voiceRequirement}+ mins`);
    }
    if (g.captchaRequirement) {
        reqs.push("• **Captcha Verification**");
    }
    if (reqs.length > 0) {
        description += "\n**Requirements:**\n" + reqs.join("\n");
    }
    description += `\n\nReact with ${g.emoji} to enter!`;
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(g.prize)
        .setDescription(description)
        .setColor(theme_1.Theme.EmbedColor)
        .setFooter({ text: `${participantCount} Participants` })
        .setTimestamp();
    if (g.thumbnail) {
        embed.setThumbnail(g.thumbnail);
    }
    return embed;
}
function createGiveawayButton(giveawayId) {
    return new discord_js_1.ButtonBuilder()
        .setLabel("Enter Giveaway")
        .setStyle(discord_js_1.ButtonStyle.Success)
        .setCustomId(`enter_giveaway_${giveawayId}`)
        .setEmoji("🎉");
}
function giveawayEndedEmbed(g, winners) {
    const winnerMentions = winners.length > 0 ? winners.map(id => `<@${id}>`).join(", ") : "No valid entrants";
    return new discord_js_1.EmbedBuilder()
        .setTitle("Giveaway Ended")
        .setDescription(`**Prize:** ${g.prize}\n**Winners:** ${winnerMentions}\n**Hosted By:** <@${g.hostId}>`)
        .setColor(theme_1.Theme.EmbedColor)
        .setFooter({ text: "Ended" })
        .setTimestamp();
}
function giveawayCancelledEmbed(g) {
    return new discord_js_1.EmbedBuilder()
        .setTitle("Giveaway Cancelled")
        .setDescription(`**Prize:** ${g.prize}\n\n❌ This giveaway was cancelled by a host.`)
        .setColor(theme_1.Theme.EmbedColor)
        .setFooter({ text: "Cancelled" });
}
