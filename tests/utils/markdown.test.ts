/**
 * Markdown Renderer Unit Tests
 *
 * Tests terminal markdown formatting
 */

import { describe, test, expect } from 'bun:test';
import { renderMarkdown } from '../../src/utils/markdown';

describe('renderMarkdown', () => {
	test('should render headers', () => {
		const input = `# Header 1
## Header 2
### Header 3`;

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('Header 1');
		expect(output).toContain('Header 2');
		expect(output).toContain('Header 3');
	});

	test('should render code blocks', () => {
		const input = `\`\`\`bash
echo "Hello World"
\`\`\``;

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('echo "Hello World"');
	});

	test('should render inline code', () => {
		const input = 'Use the `databasin` command';

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('databasin');
	});

	test('should render lists', () => {
		const input = `- Item 1
- Item 2
- Item 3`;

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('Item 1');
		expect(output).toContain('Item 2');
		expect(output).toContain('Item 3');
		expect(output).toContain('•');
	});

	test('should render numbered lists', () => {
		const input = `1. First
2. Second
3. Third`;

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('First');
		expect(output).toContain('Second');
		expect(output).toContain('Third');
	});

	test('should render links', () => {
		const input = '[Databasin](https://databasin.ai)';

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('Databasin');
		expect(output).toContain('https://databasin.ai');
	});

	test('should render blockquotes', () => {
		const input = '> This is a quote';

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('This is a quote');
	});

	test('should handle empty lines', () => {
		const input = `Line 1

Line 2`;

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('Line 1');
		expect(output).toContain('Line 2');
	});

	test('should render bold text', () => {
		const input = '**bold text**';

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('bold text');
	});

	test('should render italic text', () => {
		const input = '*italic text*';

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('italic text');
	});

	test('should handle mixed formatting', () => {
		const input = `# Title

This is **bold** and *italic* with \`code\`.

- List item 1
- List item 2

\`\`\`javascript
const x = 42;
\`\`\`

[Link](https://example.com)`;

		const output = renderMarkdown(input, { colors: false });

		expect(output).toContain('Title');
		expect(output).toContain('bold');
		expect(output).toContain('italic');
		expect(output).toContain('code');
		expect(output).toContain('List item 1');
		expect(output).toContain('const x = 42');
		expect(output).toContain('Link');
		expect(output).toContain('example.com');
	});

	test('should respect colors option', () => {
		const input = '- List item with `code`';

		const withColors = renderMarkdown(input, { colors: true });
		const withoutColors = renderMarkdown(input, { colors: false });

		// Both should contain the actual text
		expect(withColors).toContain('List item');
		expect(withColors).toContain('code');
		expect(withoutColors).toContain('List item');
		expect(withoutColors).toContain('code');

		// They should be different (colors add formatting)
		// In non-color mode, we should see bullet point
		expect(withoutColors).toContain('•');
	});
});
