/**
 * Automatic Update Checker for Databasin CLI
 *
 * Checks for new versions on GitHub releases and notifies users when updates are available.
 * Runs at most once per week to avoid excessive API calls.
 *
 * @module utils/update-checker
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getConfigDir, ensureConfigDir } from '../config.ts';
import packageJson from '../../package.json' assert { type: 'json' };

const VERSION = packageJson.version;
const GITHUB_REPO = 'databasin-ai/databasin-cli';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/** Check interval: 7 days in milliseconds */
const CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Update check state stored in config directory */
interface UpdateCheckState {
	/** Timestamp of last check */
	lastCheck: number;
	/** Latest version found (if any) */
	latestVersion?: string;
	/** Whether update was already notified */
	notified?: boolean;
}

/** Result of an update check */
export interface UpdateCheckResult {
	/** Whether an update is available */
	updateAvailable: boolean;
	/** Current installed version */
	currentVersion: string;
	/** Latest available version (if found) */
	latestVersion?: string;
	/** URL to the release page */
	releaseUrl?: string;
}

/**
 * Get path to update check state file
 */
function getUpdateCheckPath(): string {
	return join(getConfigDir(), 'update-check.json');
}

/**
 * Load update check state from file
 */
function loadUpdateCheckState(): UpdateCheckState | null {
	const path = getUpdateCheckPath();
	if (!existsSync(path)) {
		return null;
	}

	try {
		const content = readFileSync(path, 'utf-8');
		return JSON.parse(content);
	} catch {
		return null;
	}
}

/**
 * Save update check state to file
 */
function saveUpdateCheckState(state: UpdateCheckState): void {
	try {
		ensureConfigDir();
		const path = getUpdateCheckPath();
		writeFileSync(path, JSON.stringify(state, null, 2), { mode: 0o600 });
	} catch {
		// Silently fail - don't interrupt CLI usage
	}
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
 * Check if enough time has passed since last check
 */
function shouldCheck(state: UpdateCheckState | null): boolean {
	if (!state) return true;

	const now = Date.now();
	const elapsed = now - state.lastCheck;

	return elapsed >= CHECK_INTERVAL_MS;
}

/**
 * Fetch latest release from GitHub API
 * Returns null if fetch fails (network error, rate limit, etc.)
 */
async function fetchLatestRelease(): Promise<{ version: string; url: string } | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		const response = await fetch(GITHUB_API_URL, {
			headers: {
				Accept: 'application/vnd.github.v3+json',
				'User-Agent': `databasin-cli/${VERSION}`
			},
			signal: controller.signal
		});

		clearTimeout(timeout);

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as { tag_name: string; html_url: string };
		return {
			version: data.tag_name.replace(/^v/, ''),
			url: data.html_url
		};
	} catch {
		// Network error, timeout, or parsing error - fail silently
		return null;
	}
}

/**
 * Check if update checks are disabled via environment variable
 */
function isDisabledByEnv(): boolean {
	return process.env.DATABASIN_NO_UPDATE_CHECK === 'true' || process.env.DATABASIN_NO_UPDATE_CHECK === '1';
}

/**
 * Check for updates (non-blocking, fails silently)
 *
 * This function is designed to be called at CLI startup without
 * blocking or affecting normal operation. It:
 * - Checks at most once per week
 * - Times out after 5 seconds
 * - Never throws errors
 * - Stores check state to avoid redundant API calls
 *
 * @param options - Optional settings
 * @param options.disabled - If true, skip update check (from config noUpdateCheck)
 * @returns Update check result, or null if check was skipped/failed
 */
export async function checkForUpdates(options?: { disabled?: boolean }): Promise<UpdateCheckResult | null> {
	// Don't check if disabled via config or environment variable
	if (options?.disabled || isDisabledByEnv()) {
		return null;
	}

	// Load previous state
	const state = loadUpdateCheckState();

	// Skip if we've checked recently
	if (!shouldCheck(state)) {
		// Return cached result if we have a newer version
		if (state?.latestVersion && compareVersions(state.latestVersion, VERSION) > 0) {
			return {
				updateAvailable: true,
				currentVersion: VERSION,
				latestVersion: state.latestVersion,
				releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v${state.latestVersion}`
			};
		}
		return null;
	}

	// Fetch latest release
	const release = await fetchLatestRelease();

	// Update state regardless of result
	const newState: UpdateCheckState = {
		lastCheck: Date.now(),
		latestVersion: release?.version
	};
	saveUpdateCheckState(newState);

	if (!release) {
		return null;
	}

	// Compare versions
	const comparison = compareVersions(release.version, VERSION);

	if (comparison > 0) {
		return {
			updateAvailable: true,
			currentVersion: VERSION,
			latestVersion: release.version,
			releaseUrl: release.url
		};
	}

	return {
		updateAvailable: false,
		currentVersion: VERSION
	};
}

/**
 * Get cached update info without making API call
 *
 * Returns cached update info if available and update is still relevant.
 * Useful for showing notification without waiting for network.
 *
 * @param options - Optional settings
 * @param options.disabled - If true, skip update check (from config noUpdateCheck)
 * @returns Cached update result or null
 */
export function getCachedUpdateInfo(options?: { disabled?: boolean }): UpdateCheckResult | null {
	// Don't check if disabled via config or environment variable
	if (options?.disabled || isDisabledByEnv()) {
		return null;
	}

	const state = loadUpdateCheckState();

	if (!state?.latestVersion) {
		return null;
	}

	if (compareVersions(state.latestVersion, VERSION) > 0) {
		return {
			updateAvailable: true,
			currentVersion: VERSION,
			latestVersion: state.latestVersion,
			releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v${state.latestVersion}`
		};
	}

	return null;
}

/**
 * Force an update check regardless of last check time
 *
 * Used by the `databasin update --check` command.
 *
 * @returns Update check result
 */
export async function forceCheckForUpdates(): Promise<UpdateCheckResult> {
	const release = await fetchLatestRelease();

	// Update state
	const newState: UpdateCheckState = {
		lastCheck: Date.now(),
		latestVersion: release?.version
	};
	saveUpdateCheckState(newState);

	if (!release) {
		return {
			updateAvailable: false,
			currentVersion: VERSION
		};
	}

	const comparison = compareVersions(release.version, VERSION);

	return {
		updateAvailable: comparison > 0,
		currentVersion: VERSION,
		latestVersion: release.version,
		releaseUrl: release.url
	};
}

/**
 * Format update notification message for display
 */
export function formatUpdateNotification(result: UpdateCheckResult): string {
	if (!result.updateAvailable || !result.latestVersion) {
		return '';
	}

	const lines = [
		'',
		'\x1b[33m╭─────────────────────────────────────────────────────╮\x1b[0m',
		'\x1b[33m│\x1b[0m  \x1b[1mUpdate available!\x1b[0m                                  \x1b[33m│\x1b[0m',
		`\x1b[33m│\x1b[0m  ${result.currentVersion} → \x1b[32m${result.latestVersion}\x1b[0m${' '.repeat(40 - result.currentVersion.length - result.latestVersion.length)}\x1b[33m│\x1b[0m`,
		'\x1b[33m│\x1b[0m                                                     \x1b[33m│\x1b[0m',
		'\x1b[33m│\x1b[0m  Run \x1b[36mdatabasin update\x1b[0m to install                   \x1b[33m│\x1b[0m',
		'\x1b[33m╰─────────────────────────────────────────────────────╯\x1b[0m',
		''
	];

	return lines.join('\n');
}
