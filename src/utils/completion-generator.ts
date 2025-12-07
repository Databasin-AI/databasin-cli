/**
 * Shell Completion Generator
 *
 * Generates completion scripts for bash, zsh, and fish shells.
 * Automatically extracts command structure and options from a live Commander program instance.
 *
 * This generator introspects the Commander program tree to ensure completions
 * always match the actual CLI structure, even as commands are added/removed.
 *
 * @module utils/completion-generator
 */

import { Command } from 'commander';

/**
 * Represents a command option for completion
 */
interface CompletionOption {
	flags: string;
	description: string;
	/** Whether this is a global option (inherited by all commands) */
	isGlobal?: boolean;
}

/**
 * Represents a subcommand for completion
 */
interface CompletionCommand {
	name: string;
	description: string;
	options: CompletionOption[];
	subcommands: CompletionCommand[];
}

/**
 * Extract completion information from a live Commander program instance
 *
 * Recursively walks the command tree to extract all commands, subcommands, and options.
 * This ensures completions always match the actual CLI structure without manual updates.
 *
 * @param program - The Commander program instance
 * @returns Structured completion data
 */
export function extractCommandStructure(program: Command): CompletionCommand {
	const commands: CompletionCommand[] = [];

	// Get all direct subcommands
	for (const cmd of program.commands) {
		commands.push(extractCommandInfo(cmd));
	}

	// Extract options, marking global ones
	const globalOptions = extractOptions(program, true);

	return {
		name: program.name(),
		description: program.description() || '',
		options: globalOptions,
		subcommands: commands
	};
}

/**
 * Recursively extract information from a command and its subcommands
 *
 * @param cmd - The command to extract info from
 * @param depth - Current recursion depth (for limiting deeply nested commands)
 * @returns Completion command info
 */
function extractCommandInfo(cmd: Command, depth = 0): CompletionCommand {
	const subcommands: CompletionCommand[] = [];

	// Limit recursion depth to prevent issues with very deep command trees
	if (depth < 10) {
		// Get all subcommands of this command
		for (const subCmd of cmd.commands) {
			subcommands.push(extractCommandInfo(subCmd, depth + 1));
		}
	}

	return {
		name: cmd.name() || '',
		description: cmd.description() || '',
		options: extractOptions(cmd, false),
		subcommands
	};
}

/**
 * Extract all options from a command
 *
 * @param cmd - The command to extract options from
 * @param isGlobal - Whether these are global options
 * @returns Array of completion options
 */
function extractOptions(cmd: Command, isGlobal = false): CompletionOption[] {
	const options: CompletionOption[] = [];

	for (const option of cmd.options) {
		// Skip help option - it's implicit
		if (option.flags.includes('--help')) {
			continue;
		}

		options.push({
			flags: option.flags,
			description: option.description || '',
			isGlobal
		});
	}

	return options;
}

/**
 * Generate bash completion script
 */
export function generateBashCompletion(structure: CompletionCommand): string {
	const scriptName = structure.name;

	const bashScript = `#!/bin/bash
# Bash completion for ${scriptName}
# Installation:
#   1. Copy this file to /usr/share/bash-completion/completions/${scriptName}
#   2. Or source it in ~/.bashrc:
#      source <(${scriptName} completion bash)

_${scriptName.replace(/-/g, '_')}_completion() {
    local cur prev words cword
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=\${COMP_CWORD}

    # Commands
    local commands="${structure.subcommands.map((cmd) => cmd.name).join(' ')}"

    # Global options
    local global_options="--help --version --api-url --token --json --csv --verbose --no-color --debug"

    # Get the command (first non-option argument after program name)
    local cmd=""
    for ((i = 1; i < cword; i++)); do
        if [[ "\${words[i]}" != -* ]]; then
            cmd="\${words[i]}"
            break
        fi
    done

    # Complete based on context
    if [[ -z "\$cmd" ]]; then
        # Completing at top level - show commands and global options
        COMPREPLY=( $(compgen -W "\$commands \$global_options" -- "\$cur") )
    else
        # Completing after a command - show command-specific options
        case "\$cmd" in
${structure.subcommands
	.map((cmd) => {
		const options = cmd.options.map((opt) => opt.flags.split(',')[0].trim()).join(' ');
		return `            ${cmd.name})
                COMPREPLY=( $(compgen -W "${options} \$global_options" -- "\$cur") )
                ;;`;
	})
	.join('\n')}
            *)
                COMPREPLY=( $(compgen -W "\$global_options" -- "\$cur") )
                ;;
        esac
    fi
}

complete -o bashdefault -o default -o nospace -F _${scriptName.replace(/-/g, '_')}_completion ${scriptName}
`;

	return bashScript;
}

/**
 * Generate zsh completion script
 */
export function generateZshCompletion(structure: CompletionCommand): string {
	const scriptName = structure.name;

	// Build command completion entries
	const commandCompletions = structure.subcommands
		.map(
			(cmd) =>
				`  '${cmd.name}:${cmd.description}'`
		)
		.join('\n');

	// Build global options
	const globalOptions = [
		"'--help[Show help information]'",
		"'--version[Show version]'",
		"'--api-url[Databasin API base URL]:url:'",
		"'--token[Authentication token]:token:'",
		"'--json[Output in JSON format]'",
		"'--csv[Output in CSV format]'",
		"'--verbose[Enable verbose logging]'",
		"'--no-color[Disable colored output]'",
		"'--debug[Enable debug mode]'"
	].join('\n  ');

	const zshScript = `#compdef ${scriptName}
# Zsh completion for ${scriptName}
# Installation:
#   1. Copy this file to /usr/share/zsh/site-functions/_${scriptName}
#   2. Or add to ~/.zshrc:
#      autoload -U +X compinit && compinit
#      # Then source this file

_${scriptName}_main() {
    local state ret=1

    _arguments -C \\
        ${globalOptions} \\
        '1: :->commands' \\
        '*:: :->args' && ret=0

    case \$state in
        commands)
            _values 'commands' \\
${commandCompletions}
            ret=0
            ;;
        args)
            case \$words[2] in
${structure.subcommands
	.map(
		(cmd) => `                ${cmd.name})
                    _values 'options' \\
${cmd.options
	.map((opt) => {
		const flagName = opt.flags.split(',')[0].replace(/^-+/, '');
		return `                        '${opt.flags}[${opt.description}]'`;
	})
	.join(' \\\n')}
                    ret=0
                    ;;`
	)
	.join('\n')}
            esac
            ;;
    esac

    return ret
}

_${scriptName}_main
`;

	return zshScript;
}

/**
 * Generate fish completion script
 */
export function generateFishCompletion(structure: CompletionCommand): string {
	const scriptName = structure.name;

	// Build command completions
	const commandCompletions = structure.subcommands
		.map((cmd) => `complete -c ${scriptName} -f -n "__fish_use_subcommand_from_args" -a "${cmd.name}" -d "${cmd.description}"`)
		.join('\n');

	// Build global option completions
	const globalOptionCompletions = [
		`complete -c ${scriptName} -l help -d "Show help information"`,
		`complete -c ${scriptName} -l version -d "Show version"`,
		`complete -c ${scriptName} -l api-url -d "Databasin API base URL" -x`,
		`complete -c ${scriptName} -l token -d "Authentication token" -x`,
		`complete -c ${scriptName} -l json -d "Output in JSON format"`,
		`complete -c ${scriptName} -l csv -d "Output in CSV format"`,
		`complete -c ${scriptName} -l verbose -d "Enable verbose logging"`,
		`complete -c ${scriptName} -l no-color -d "Disable colored output"`,
		`complete -c ${scriptName} -l debug -d "Enable debug mode"`
	].join('\n');

	// Build command-specific options
	const commandOptions = structure.subcommands
		.map((cmd) => {
			const options = cmd.options
				.map((opt) => {
					const flagName = opt.flags.split(',')[0].replace(/^-+/, '');
					const isShort = flagName.length === 1;
					return `complete -c ${scriptName} -n "__fish_seen_subcommand_from ${cmd.name}" ${isShort ? '-s' : '-l'} ${flagName} -d "${opt.description}"`;
				})
				.join('\n');
			return options;
		})
		.filter((str) => str.length > 0)
		.join('\n');

	const fishScript = `# Fish completion for ${scriptName}
# Installation:
#   1. Copy this file to ~/.config/fish/completions/${scriptName}.fish
#   2. Or run: mkdir -p ~/.config/fish/completions
#              curl -o ~/.config/fish/completions/${scriptName}.fish https://...

# Commands
${commandCompletions}

# Global options
${globalOptionCompletions}

# Command-specific options
${commandOptions}
`;

	return fishScript;
}
