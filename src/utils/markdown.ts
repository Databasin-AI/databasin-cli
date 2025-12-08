/**
 * Markdown Terminal Renderer
 *
 * Renders markdown content for terminal display with color and formatting.
 * Supports common markdown syntax:
 * - Headers (# ## ###)
 * - Bold (**text**)
 * - Italic (*text*)
 * - Code blocks (```)
 * - Inline code (`code`)
 * - Links ([text](url))
 * - Lists (- or *)
 * - Blockquotes (>)
 * - Horizontal rules (---)
 *
 * @module utils/markdown
 */

import chalk from 'chalk';

export interface MarkdownRenderOptions {
	/** Enable colored output (default: true) */
	colors?: boolean;
	/** Terminal width for wrapping (default: 80) */
	width?: number;
	/** Indent level for nested content (default: 0) */
	indent?: number;
}

/**
 * Render markdown to terminal-formatted text
 *
 * @param markdown - Raw markdown content
 * @param options - Rendering options
 * @returns Formatted text ready for terminal display
 */
export function renderMarkdown(markdown: string, options: MarkdownRenderOptions = {}): string {
	const { colors = true, width = 100, indent = 0 } = options;

	const lines = markdown.split('\n');
	const output: string[] = [];
	let inCodeBlock = false;
	let codeBlockLang = '';
	let codeBlockLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		// Handle code blocks
		if (trimmed.startsWith('```')) {
			if (inCodeBlock) {
				// End code block
				output.push(renderCodeBlock(codeBlockLines.join('\n'), codeBlockLang, colors, indent));
				codeBlockLines = [];
				codeBlockLang = '';
				inCodeBlock = false;
			} else {
				// Start code block
				codeBlockLang = trimmed.substring(3).trim();
				inCodeBlock = true;
			}
			continue;
		}

		if (inCodeBlock) {
			codeBlockLines.push(line);
			continue;
		}

		// Handle different line types
		if (trimmed === '') {
			output.push('');
		} else if (trimmed.startsWith('#')) {
			output.push(renderHeader(trimmed, colors, indent));
		} else if (trimmed.startsWith('>')) {
			output.push(renderBlockquote(trimmed, colors, indent));
		} else if ((trimmed.startsWith('-') || trimmed.startsWith('+')) && trimmed.length > 1 && trimmed[1] === ' ') {
			// Bullet list with - or +
			output.push(renderListItem(trimmed, colors, indent));
		} else if (trimmed.startsWith('*') && trimmed.length > 1 && trimmed[1] === ' ') {
			// Bullet list with *
			output.push(renderListItem(trimmed, colors, indent));
		} else if (trimmed.match(/^[-*_]{3,}$/)) {
			// Horizontal rule
			output.push(renderHorizontalRule(colors, indent));
		} else if (trimmed.match(/^\d+\./)) {
			// Numbered list
			output.push(renderNumberedListItem(trimmed, colors, indent));
		} else {
			output.push(renderText(trimmed, colors, indent));
		}
	}

	// Handle unclosed code block
	if (inCodeBlock && codeBlockLines.length > 0) {
		output.push(renderCodeBlock(codeBlockLines.join('\n'), codeBlockLang, colors, indent));
	}

	return output.join('\n');
}

/**
 * Render header (# ## ###)
 */
function renderHeader(line: string, colors: boolean, indent: number): string {
	const match = line.match(/^(#{1,6})\s+(.+)$/);
	if (!match) return line;

	const level = match[1].length;
	const text = match[2];
	const indentStr = ' '.repeat(indent);

	if (!colors) {
		return `${indentStr}${text}\n${indentStr}${'='.repeat(text.length)}`;
	}

	switch (level) {
		case 1:
			return `\n${indentStr}${chalk.bold.cyan(text)}\n${indentStr}${chalk.cyan('='.repeat(text.length))}`;
		case 2:
			return `\n${indentStr}${chalk.bold.blue(text)}\n${indentStr}${chalk.blue('-'.repeat(text.length))}`;
		case 3:
			return `\n${indentStr}${chalk.bold.yellow(text)}`;
		case 4:
			return `${indentStr}${chalk.bold(text)}`;
		default:
			return `${indentStr}${chalk.dim(text)}`;
	}
}

/**
 * Render blockquote (>)
 */
function renderBlockquote(line: string, colors: boolean, indent: number): string {
	const text = line.substring(1).trim();
	const indentStr = ' '.repeat(indent);
	const formattedText = renderInlineFormatting(text, colors);

	if (colors) {
		return `${indentStr}${chalk.dim('│')} ${chalk.italic(formattedText)}`;
	}
	return `${indentStr}> ${formattedText}`;
}

/**
 * Render list item (- or *)
 */
function renderListItem(line: string, colors: boolean, indent: number): string {
	const text = line.substring(1).trim();
	const indentStr = ' '.repeat(indent);
	const formattedText = renderInlineFormatting(text, colors);

	if (colors) {
		return `${indentStr}${chalk.cyan('•')} ${formattedText}`;
	}
	return `${indentStr}• ${formattedText}`;
}

/**
 * Render numbered list item (1. 2. 3.)
 */
function renderNumberedListItem(line: string, colors: boolean, indent: number): string {
	const match = line.match(/^(\d+)\.\s+(.+)$/);
	if (!match) return line;

	const num = match[1];
	const text = match[2];
	const indentStr = ' '.repeat(indent);
	const formattedText = renderInlineFormatting(text, colors);

	if (colors) {
		return `${indentStr}${chalk.cyan(num + '.')} ${formattedText}`;
	}
	return `${indentStr}${num}. ${formattedText}`;
}

/**
 * Render horizontal rule
 */
function renderHorizontalRule(colors: boolean, indent: number): string {
	const indentStr = ' '.repeat(indent);
	const rule = '─'.repeat(80);

	if (colors) {
		return `${indentStr}${chalk.dim(rule)}`;
	}
	return `${indentStr}${rule}`;
}

/**
 * Render code block
 */
function renderCodeBlock(code: string, lang: string, colors: boolean, indent: number): string {
	const indentStr = ' '.repeat(indent);
	const lines = code.split('\n');

	if (!colors) {
		return lines.map(line => `${indentStr}  ${line}`).join('\n');
	}

	const header = lang ? chalk.dim(`┌─ ${lang}`) : chalk.dim('┌─');
	const footer = chalk.dim('└─');
	const codeLines = lines.map(line => {
		const codeLine = line || ' '; // Ensure empty lines have content
		return `${indentStr}${chalk.dim('│')} ${chalk.gray(codeLine)}`;
	});

	return [
		`${indentStr}${header}`,
		...codeLines,
		`${indentStr}${footer}`
	].join('\n');
}

/**
 * Render regular text with inline formatting
 */
function renderText(line: string, colors: boolean, indent: number): string {
	const indentStr = ' '.repeat(indent);
	const formatted = renderInlineFormatting(line, colors);
	return `${indentStr}${formatted}`;
}

/**
 * Render inline markdown formatting
 *
 * Handles:
 * - **bold**
 * - *italic*
 * - `code`
 * - [links](url)
 */
function renderInlineFormatting(text: string, colors: boolean): string {
	let result = text;

	if (!colors) {
		// Just strip markdown syntax for non-color output
		result = result.replace(/\*\*(.+?)\*\*/g, '$1'); // bold
		result = result.replace(/\*(.+?)\*/g, '$1'); // italic
		result = result.replace(/`(.+?)`/g, '$1'); // inline code
		result = result.replace(/\[(.+?)\]\((.+?)\)/g, '$1 ($2)'); // links
		return result;
	}

	// Bold: **text**
	result = result.replace(/\*\*(.+?)\*\*/g, (_, text) => chalk.bold(text));

	// Italic: *text*
	result = result.replace(/\*(.+?)\*/g, (_, text) => chalk.italic(text));

	// Inline code: `code`
	result = result.replace(/`(.+?)`/g, (_, code) => chalk.cyan.inverse(` ${code} `));

	// Links: [text](url)
	result = result.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => {
		return `${chalk.blue.underline(text)} ${chalk.dim('(' + url + ')')}`;
	});

	return result;
}
