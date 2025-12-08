/**
 * Update Command for Databasin CLI
 *
 * Provides self-update functionality by downloading the latest release from GitHub.
 * Supports both standalone binary updates and npm package updates.
 *
 * @module commands/update
 */

import { Command } from 'commander';
import { createWriteStream, existsSync, unlinkSync, renameSync, chmodSync, copyFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import chalk from 'chalk';
import packageJson from '../../package.json' assert { type: 'json' };
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	logSuccess,
	logError,
	logWarning
} from '../utils/progress.ts';

const VERSION = packageJson.version;
const GITHUB_REPO = 'databasin-ai/databasin-cli';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

interface GitHubRelease {
	tag_name: string;
	name: string;
	published_at: string;
	html_url: string;
	assets: GitHubAsset[];
}

interface GitHubAsset {
	name: string;
	browser_download_url: string;
	size: number;
}

/**
 * Get the platform identifier (e.g., linux-x64, darwin-arm64)
 */
function getPlatformIdentifier(): string {
	const platform = process.platform;
	const arch = process.arch;

	if (platform === 'linux' && arch === 'x64') {
		return 'linux-x64';
	} else if (platform === 'darwin' && arch === 'arm64') {
		return 'darwin-arm64';
	} else if (platform === 'darwin' && arch === 'x64') {
		return 'darwin-x64';
	}

	throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

/**
 * Get the platform-specific asset name for GitHub releases
 * e.g., databasin-linux-x64, databasin-darwin-arm64
 */
function getPlatformAssetName(): string {
	return `databasin-${getPlatformIdentifier()}`;
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
	const normalize = (v: string) => v.replace(/^v/, '');
	const parts1 = normalize(v1).split('.').map(Number);
	const parts2 = normalize(v2).split('.').map(Number);

	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const p1 = parts1[i] || 0;
		const p2 = parts2[i] || 0;
		if (p1 > p2) return 1;
		if (p1 < p2) return -1;
	}
	return 0;
}

/**
 * Fetch the latest release info from GitHub
 */
async function fetchLatestRelease(): Promise<GitHubRelease> {
	const response = await fetch(GITHUB_API_URL, {
		headers: {
			Accept: 'application/vnd.github.v3+json',
			'User-Agent': `databasin-cli/${VERSION}`
		}
	});

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('No releases found on GitHub');
		}
		if (response.status === 403) {
			throw new Error('GitHub API rate limit exceeded. Try again later.');
		}
		throw new Error(`Failed to fetch release info: ${response.status} ${response.statusText}`);
	}

	return response.json() as Promise<GitHubRelease>;
}

/**
 * Download a file from URL to a local path
 */
async function downloadFile(url: string, destPath: string, onProgress?: (percent: number) => void): Promise<void> {
	const response = await fetch(url, {
		headers: {
			'User-Agent': `databasin-cli/${VERSION}`
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
	}

	const contentLength = response.headers.get('content-length');
	const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

	if (!response.body) {
		throw new Error('No response body');
	}

	const fileStream = createWriteStream(destPath);
	const reader = response.body.getReader();
	let downloadedSize = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			fileStream.write(Buffer.from(value));
			downloadedSize += value.length;

			if (onProgress && totalSize > 0) {
				onProgress(Math.round((downloadedSize / totalSize) * 100));
			}
		}
	} finally {
		fileStream.end();
		await new Promise<void>((resolve, reject) => {
			fileStream.on('finish', resolve);
			fileStream.on('error', reject);
		});
	}
}

/**
 * Get the path to the currently running executable
 */
function getCurrentExecutablePath(): string {
	// process.execPath gives us the path to the executable
	// For standalone binaries, this is the binary itself
	// For node/bun running a script, this is node/bun
	const execPath = process.execPath;

	// Check if we're running as a standalone binary
	// Standalone binaries have the CLI name in the path
	if (execPath.includes('databasin')) {
		return execPath;
	}

	// We're running via node/bun - check argv[1] for the script
	// This case means user installed via npm
	return process.argv[1] || execPath;
}

/**
 * Check if running as standalone binary vs npm package
 */
function isStandaloneBinary(): boolean {
	const execPath = process.execPath;
	// Standalone binaries compiled with Bun have the CLI name in the path
	return execPath.includes('databasin') && !execPath.includes('node') && !execPath.includes('bun');
}

/**
 * Safely move a file, handling cross-device moves
 * Uses rename when possible, falls back to copy+delete for cross-device moves
 */
function safeMove(source: string, destination: string): void {
	try {
		// Try rename first (fastest, atomic)
		renameSync(source, destination);
	} catch (error) {
		// If rename fails due to cross-device link (EXDEV), use copy+delete
		if (error instanceof Error && 'code' in error && error.code === 'EXDEV') {
			copyFileSync(source, destination);
			unlinkSync(source);
		} else {
			throw error;
		}
	}
}

/**
 * Create update command
 */
export function createUpdateCommand(): Command {
	const update = new Command('update').description('Update Databasin CLI to the latest version');

	update
		.option('--check', 'Check for updates without installing')
		.option('--force', 'Force update even if already on latest version')
		.option('--version <version>', 'Update to a specific version (e.g., 0.3.1)')
		.action(async (options) => {
			const currentVersion = VERSION;

			console.log(chalk.bold('\nDatabasin CLI Update\n'));
			console.log(`Current version: ${chalk.cyan(currentVersion)}`);

			// Fetch latest release info
			const fetchSpinner = startSpinner('Checking for updates...');

			let release: GitHubRelease;
			try {
				release = await fetchLatestRelease();
				succeedSpinner(fetchSpinner);
			} catch (error) {
				failSpinner(fetchSpinner, 'Failed to check for updates');
				if (error instanceof Error) {
					logError(error.message);
				}
				throw error;
			}

			const latestVersion = release.tag_name.replace(/^v/, '');
			console.log(`Latest version:  ${chalk.green(latestVersion)}`);
			console.log(`Released:        ${chalk.dim(new Date(release.published_at).toLocaleDateString())}`);

			// Compare versions
			const comparison = compareVersions(latestVersion, currentVersion);

			if (comparison === 0 && !options.force) {
				console.log(chalk.green('\n✓ You are already on the latest version!\n'));
				return;
			}

			if (comparison < 0 && !options.force) {
				console.log(chalk.yellow('\n⚠ Your version is newer than the latest release.'));
				console.log(chalk.dim('  Use --force to downgrade.\n'));
				return;
			}

			if (options.check) {
				if (comparison > 0) {
					console.log(chalk.yellow(`\n⬆ Update available: ${currentVersion} → ${latestVersion}`));
					console.log(chalk.dim(`  Run 'databasin update' to install.\n`));
					console.log(`Release notes: ${release.html_url}\n`);
				}
				return;
			}

			// Check if running as standalone binary
			if (!isStandaloneBinary()) {
				console.log(chalk.yellow('\n⚠ You installed via npm/bun. Use your package manager to update:'));
				console.log(chalk.dim('  npm update -g @databasin/cli'));
				console.log(chalk.dim('  bun update -g @databasin/cli\n'));
				return;
			}

			// Find the appropriate asset for this platform
			let assetName: string;
			try {
				assetName = getPlatformAssetName();
			} catch (error) {
				if (error instanceof Error) {
					logError(error.message);
				}
				throw error;
			}

			// Find the binary in release assets
			// Assets are named like: databasin-linux-x64, databasin-darwin-arm64
			const asset = release.assets.find((a) => a.name === assetName);

			if (!asset) {
				logError(`No binary found for platform: ${assetName}`);
				console.log(chalk.dim('\nAvailable assets:'));
				release.assets.forEach((a) => console.log(chalk.dim(`  - ${a.name}`)));
				throw new Error('Platform binary not found');
			}

			console.log(`\nDownloading ${chalk.cyan(asset.name)} (${(asset.size / 1024 / 1024).toFixed(2)} MB)...`);

			// Download to temp location
			const tempPath = join(tmpdir(), `databasin-update-${Date.now()}`);
			const downloadSpinner = startSpinner('Downloading...');

			try {
				let lastPercent = 0;
				await downloadFile(asset.browser_download_url, tempPath, (percent) => {
					if (percent !== lastPercent && percent % 10 === 0) {
						downloadSpinner.text = `Downloading... ${percent}%`;
						lastPercent = percent;
					}
				});
				succeedSpinner(downloadSpinner, 'Download complete');
			} catch (error) {
				failSpinner(downloadSpinner, 'Download failed');
				if (existsSync(tempPath)) {
					unlinkSync(tempPath);
				}
				throw error;
			}

			// Get current executable path
			const currentExePath = getCurrentExecutablePath();
			const backupPath = `${currentExePath}.backup`;

			console.log(`\nInstalling to: ${chalk.dim(currentExePath)}`);

			const installSpinner = startSpinner('Installing update...');

			try {
				// Backup current executable
				if (existsSync(currentExePath)) {
					safeMove(currentExePath, backupPath);
				}

				// Move new binary to destination
				safeMove(tempPath, currentExePath);

				// Make executable
				chmodSync(currentExePath, 0o755);

				// Remove backup
				if (existsSync(backupPath)) {
					unlinkSync(backupPath);
				}

				succeedSpinner(installSpinner, 'Update installed successfully');
			} catch (error) {
				failSpinner(installSpinner, 'Installation failed');

				// Restore backup if available
				if (existsSync(backupPath)) {
					try {
						if (existsSync(currentExePath)) {
							unlinkSync(currentExePath);
						}
						safeMove(backupPath, currentExePath);
						console.log(chalk.dim('  Restored previous version'));
					} catch (restoreError) {
						logError('Failed to restore backup. Manual reinstallation may be required.');
					}
				}

				// Clean up temp file
				if (existsSync(tempPath)) {
					unlinkSync(tempPath);
				}

				throw error;
			}

			console.log(chalk.green(`\n✓ Updated to version ${latestVersion}!\n`));
			console.log(chalk.dim(`Release notes: ${release.html_url}\n`));
		});

	// Add check subcommand as an alias
	update
		.command('check')
		.description('Check for available updates')
		.action(async () => {
			// Delegate to main command with --check flag
			await update.parseAsync(['node', 'update', '--check']);
		});

	return update;
}
