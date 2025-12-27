import { Message, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface CommandData {
  name: string;
  description: string;
  category: string;
  syntax?: string;
  example?: string;
  permissions?: string[];
  aliases?: string[];
}

export interface Command {
  data: CommandData | SlashCommandBuilder;
  execute?: (interaction: ChatInputCommandInteraction) => Promise<void>;
  prefixRun?: (message: Message, args: string[]) => Promise<void>;
  autocomplete?: (interaction: any) => Promise<void>;
}
