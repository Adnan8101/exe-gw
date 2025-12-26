import { SlashCommandBuilder, ChatInputCommandInteraction, ActivityType } from 'discord.js';
import { Emojis } from '../../utils/emojis';

const OWNER_ID = '929297205796417597';

export default {
    data: new SlashCommandBuilder()
        .setName('changeactivity')
        .setDescription('Change bot activity status (Developer only)')
        .addStringOption(option =>
            option.setName('activity')
                .setDescription('The activity text to display')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('type')
                .setDescription('Activity type')
                .setRequired(true)
                .addChoices(
                    { name: 'Playing', value: 0 },
                    { name: 'Streaming', value: 1 },
                    { name: 'Listening', value: 2 },
                    { name: 'Watching', value: 3 },
                    { name: 'Competing', value: 5 }
                ))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Bot status')
                .setRequired(false)
                .addChoices(
                    { name: 'Online', value: 'online' },
                    { name: 'Idle', value: 'idle' },
                    { name: 'Do Not Disturb', value: 'dnd' },
                    { name: 'Invisible', value: 'invisible' }
                )),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: `${Emojis.CROSS} This command is developer only.`, ephemeral: true });
        }

        const activity = interaction.options.getString('activity', true);
        const type = interaction.options.getInteger('type', true) as ActivityType;
        const status = interaction.options.getString('status') || 'online';

        try {
            interaction.client.user?.setPresence({
                activities: [{
                    name: activity,
                    type: type
                }],
                status: status as any
            });

            await interaction.reply({ 
                content: `${Emojis.TICK} Bot activity updated successfully!\nActivity: ${activity}\nType: ${getActivityTypeName(type)}\nStatus: ${status}`, 
                ephemeral: true 
            });
        } catch (error: any) {
            await interaction.reply({ 
                content: `${Emojis.CROSS} Failed to update activity: ${error.message}`, 
                ephemeral: true 
            });
        }
    },

    async prefixRun(message: any, args: string[]) {
        if (message.author.id !== OWNER_ID) {
            return message.reply(`${Emojis.CROSS} This command is developer only.`);
        }

        if (args.length < 2) {
            return message.reply(`${Emojis.CROSS} Usage: \`!changeactivity <type> <activity text>\`\nTypes: playing, streaming, listening, watching, competing`);
        }

        const typeArg = args[0].toLowerCase();
        const activity = args.slice(1).join(' ');

        const typeMap: { [key: string]: ActivityType } = {
            'playing': 0,
            'streaming': 1,
            'listening': 2,
            'watching': 3,
            'competing': 5
        };

        const type = typeMap[typeArg];
        if (type === undefined) {
            return message.reply(`${Emojis.CROSS} Invalid type. Use: playing, streaming, listening, watching, or competing`);
        }

        try {
            message.client.user?.setPresence({
                activities: [{
                    name: activity,
                    type: type
                }],
                status: 'online'
            });

            await message.reply(`${Emojis.TICK} Bot activity updated successfully!\nActivity: ${activity}\nType: ${getActivityTypeName(type)}`);
        } catch (error: any) {
            await message.reply(`${Emojis.CROSS} Failed to update activity: ${error.message}`);
        }
    }
};

function getActivityTypeName(type: ActivityType): string {
    const names: { [key: number]: string } = {
        0: 'Playing',
        1: 'Streaming',
        2: 'Listening',
        3: 'Watching',
        5: 'Competing'
    };
    return names[type] || 'Unknown';
}
