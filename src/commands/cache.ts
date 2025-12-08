/**
 * Cache Command - Manage API response cache
 *
 * Displays cache status and allows clearing cached data.
 *
 * Usage:
 *   databasin cache status  # Show cache status
 *   databasin cache clear   # Clear all cache
 *
 * @module commands/cache
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getCacheStatus, clearCache } from '../utils/cache.ts';

/**
 * Format bytes to human-readable string
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 */
function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Display cache status
 *
 * Shows all cached entries with size and expiration info.
 */
function showCacheStatus(): void {
	const status = getCacheStatus();

	if (status.length === 0) {
		console.log(chalk.yellow('Cache is empty'));
		console.log('\nCache will be populated when you use --cache flag on list commands:');
		console.log('  databasin projects list --cache');
		console.log('  databasin connectors list --cache');
		return;
	}

	console.log(chalk.bold(`Cache Status (${status.length} entries):\n`));

	let totalSize = 0;
	for (const entry of status) {
		const expiresIn = Math.max(0, entry.expiresAt - Date.now());
		const minutes = Math.floor(expiresIn / 60000);
		const seconds = Math.floor((expiresIn % 60000) / 1000);

		const keyParts = entry.key.split(':');
		const method = keyParts[0] || 'GET';
		const endpoint = keyParts[1] || entry.key;

		console.log(`${chalk.cyan(method)} ${chalk.dim(endpoint)}`);
		console.log(`  Namespace: ${chalk.dim(entry.namespace)}`);
		console.log(`  Size: ${chalk.yellow(formatBytes(entry.size))}`);
		if (expiresIn > 0) {
			console.log(`  Expires: ${chalk.green(`${minutes}m ${seconds}s`)}`);
		} else {
			console.log(`  ${chalk.red('Expired')}`);
		}
		console.log();

		totalSize += entry.size;
	}

	console.log(chalk.bold(`Total cache size: ${formatBytes(totalSize)}`));
}

/**
 * Clear cache
 *
 * Clears all cache or specific cache key.
 *
 * @param key - Optional cache key to clear
 */
function clearCacheAction(key?: string): void {
	clearCache(key);

	if (key) {
		console.log(chalk.green(`✓ Cleared cache key: ${chalk.cyan(key)}`));
	} else {
		console.log(chalk.green('✓ Cleared all cache'));
	}
}

/**
 * Create cache command
 *
 * Creates the main 'cache' command with status and clear subcommands.
 *
 * @returns Configured Commander command
 */
export function createCacheCommand(): Command {
	const cacheCmd = new Command('cache')
		.description('Manage API response cache')
		.addHelpText(
			'after',
			`
Examples:
  $ databasin cache status              # Show cache status
  $ databasin cache clear               # Clear all cache
  $ databasin cache clear <key>         # Clear specific cache key

Cache is stored in ~/.databasin/cache/ and organized by namespace.
Cached responses reduce API calls and improve performance for list commands.

Enable caching with the --cache flag:
  $ databasin projects list --cache     # Cache for 5 minutes (default)
  $ databasin connectors list --cache   # Cache for 5 minutes (default)
`
		);

	// Status subcommand
	cacheCmd
		.command('status')
		.description('Show cache status with sizes and expiration times')
		.action(showCacheStatus);

	// Clear subcommand
	cacheCmd
		.command('clear [key]')
		.description('Clear cache (all or specific key)')
		.action(clearCacheAction);

	return cacheCmd;
}
