import { Message } from 'discord.js';
import { createMissingArgsEmbed, createCommandHelpEmbed } from './commandHelp';

interface CommandValidationRule {
  argIndex: number;
  argName: string;
  optional?: boolean;
}

interface CommandMetadata {
  name: string;
  description: string;
  metadata: {
    syntax: string;
    example: string;
    permissions: string;
    category: string;
  };
}

/**
 * Validates command arguments and shows help embed if requirements are not met
 * @param message - Discord message object
 * @param args - Array of command arguments
 * @param rules - Array of validation rules
 * @param commandData - Command metadata for help embed
 * @returns true if validation passes, false if validation fails (and help was shown)
 */
export function validateCommandArgs(
  message: Message,
  args: string[],
  rules: CommandValidationRule[],
  commandData: CommandMetadata
): boolean {
  const missingArgs: string[] = [];

  for (const rule of rules) {
    if (!rule.optional && (!args[rule.argIndex] || args[rule.argIndex].trim() === '')) {
      missingArgs.push(rule.argName);
    }
  }

  if (missingArgs.length > 0) {
    const missingText = missingArgs.join(' and ');
    message.reply({ embeds: [createMissingArgsEmbed(commandData, missingText)] });
    return false;
  }

  return true;
}

/**
 * Shows command help embed for subcommands
 * @param message - Discord message object
 * @param args - Array of command arguments
 * @param subcommand - The subcommand name
 * @param commandData - Command metadata
 */
export function showSubcommandHelp(
  message: Message,
  subcommand: string,
  commandData: CommandMetadata
): void {
  message.reply({ embeds: [createMissingArgsEmbed(commandData, 'required arguments')] });
}

/**
 * Validates that a subcommand exists
 * @param args - Array of command arguments
 * @param validSubcommands - Array of valid subcommand names
 * @returns The subcommand if valid, null otherwise
 */
export function validateSubcommand(
  args: string[],
  validSubcommands: string[]
): string | null {
  if (args.length < 1) {
    return null;
  }

  const subcommand = args[0].toLowerCase();
  return validSubcommands.includes(subcommand) ? subcommand : null;
}
