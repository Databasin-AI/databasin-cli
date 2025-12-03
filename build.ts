#!/usr/bin/env bun

/**
 * Production Build Script for Databasin CLI
 *
 * Creates optimized builds for distribution:
 * - Compiles TypeScript to JavaScript
 * - Creates executable bundles
 * - Runs tests before building
 * - Generates platform-specific builds
 *
 * Usage:
 *   bun run build.ts
 *   bun run build.ts --skip-tests
 *   bun run build.ts --platform linux
 */

import { $ } from 'bun';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { cp } from 'fs/promises';
import { join } from 'path';

// ANSI color codes
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: string): void {
	log(`\n${step}`, 'cyan');
}

function logSuccess(message: string): void {
	log(`✅ ${message}`, 'green');
}

function logError(message: string): void {
	log(`❌ ${message}`, 'red');
}

function logWarning(message: string): void {
	log(`⚠️  ${message}`, 'yellow');
}

interface BuildOptions {
	skipTests: boolean;
	platform?: string;
	clean: boolean;
	verbose: boolean;
}

function parseArgs(): BuildOptions {
	const args = process.argv.slice(2);

	return {
		skipTests: args.includes('--skip-tests'),
		platform: args.find((arg) => arg.startsWith('--platform='))?.split('=')[1],
		clean: !args.includes('--no-clean'),
		verbose: args.includes('--verbose')
	};
}

async function clean(): Promise<void> {
	logStep('🧹 Cleaning build directory...');

	const distDir = join(process.cwd(), 'dist');

	if (existsSync(distDir)) {
		rmSync(distDir, { recursive: true, force: true });
		logSuccess('Removed existing dist/ directory');
	} else {
		log('No existing dist/ directory to clean');
	}

	// Create fresh dist directory
	mkdirSync(distDir, { recursive: true });
	logSuccess('Created fresh dist/ directory');
}

async function typecheck(): Promise<void> {
	logStep('🔍 Running type checking...');

	try {
		await $`bun run typecheck`;
		logSuccess('Type checking passed');
	} catch (error) {
		logError('Type checking failed');
		throw error;
	}
}

async function runTests(): Promise<void> {
	logStep('🧪 Running tests...');
	log('Note: Integration tests excluded (require authentication)');

	try {
		// Run only unit tests (exclude integration tests that require authentication)
		await $`bun test tests/client tests/unit tests/utils src`;
		logSuccess('All tests passed');
	} catch (error) {
		logError('Tests failed');
		throw error;
	}
}

async function buildJavaScript(): Promise<void> {
	logStep('📦 Building JavaScript bundle (Node.js compatible)...');

	try {
		// Target node for npm package compatibility (works with both Node.js and Bun)
		await $`bun build src/index.ts --outdir dist --target node`;
		logSuccess('JavaScript bundle created (Node.js compatible)');
	} catch (error) {
		logError('JavaScript build failed');
		throw error;
	}
}

async function buildExecutable(): Promise<void> {
	logStep('🔨 Building executables for multiple platforms...');

	const targets = [
		{ label: 'Linux x64', target: 'bun-linux-x64' },
		{ label: 'macOS ARM64 (Apple Silicon)', target: 'bun-darwin-arm64' },
		{ label: 'macOS x64', target: 'bun-darwin-x64' }
	];

	try {
		for (const { label, target } of targets) {
			const targetDir = join(process.cwd(), 'dist', target.replace('bun-', ''));
			mkdirSync(targetDir, { recursive: true });
			log(`Building for ${label} (${target})...`);
			const outputPath = join(targetDir, 'databasin');
			await $`bun build src/index.ts --compile --target=${target} --outfile ${outputPath}`;
			await $`chmod +x ${outputPath}`;
			logSuccess(`${label} executable created: dist/${target}/databasin`);
		}
	} catch (error) {
		logError('Executable build failed');
		throw error;
	}
}

async function verifyBuild(): Promise<void> {
	logStep('✅ Verifying build...');

	// Check files exist
	const requiredFiles = [
		'dist/index.js',
		'dist/linux-x64/databasin',
		'dist/darwin-arm64/databasin',
		'dist/darwin-x64/databasin'
	];

	for (const file of requiredFiles) {
		if (!existsSync(file)) {
			logError(`Required file missing: ${file}`);
			throw new Error(`Build verification failed: ${file} not found`);
		}
	}

	logSuccess('All required files present');

	// Test Linux executable works (on Linux systems)
	if (process.platform === 'linux') {
		try {
			const result = await $`./dist/linux/databasin --version`.text();
			log(`Version: ${result.trim()}`);
			logSuccess('Linux executable runs successfully');
		} catch (error) {
			logWarning('Linux executable test failed (this is OK if building on macOS)');
		}
	} else {
		logWarning('Skipping Linux executable test (not on Linux)');
	}
}

async function generateMetadata(): Promise<void> {
	logStep('📝 Generating build metadata...');

	const metadata = {
		buildDate: new Date().toISOString(),
		version: JSON.parse(await Bun.file('package.json').text()).version,
		platform: process.platform,
		arch: process.arch,
		bunVersion: Bun.version
	};

	await Bun.write('dist/build-info.json', JSON.stringify(metadata, null, 2));

	logSuccess('Build metadata generated');
	log(JSON.stringify(metadata, null, 2));
}

async function showBuildSummary(): Promise<void> {
	logStep('📊 Build Summary');

	const distDir = join(process.cwd(), 'dist');

	// Get file sizes
	const files = [
		{ name: 'JavaScript bundle', path: 'dist/index.js' },
		{ name: 'Linux executable', path: 'dist/linux/databasin' },
		{ name: 'macOS executable', path: 'dist/macos/databasin' },
		{ name: 'Build metadata', path: 'dist/build-info.json' }
	];

	log('\nBuild artifacts:');
	for (const file of files) {
		if (existsSync(file.path)) {
			const stat = await Bun.file(file.path).size;
			const sizeMB = (stat / 1024 / 1024).toFixed(2);
			log(`  ${file.name}: ${sizeMB} MB`);
		}
	}

	log('\nNext steps:');
	log('  1. Test Linux x64 build:  ./dist/linux-x64/databasin --help');
	log('  2. Test macOS ARM64 build:  ./dist/darwin-arm64/databasin --help');
	log('  3. Test macOS x64 build:  ./dist/darwin-x64/databasin --help');
	log('  4. Install locally:   npm link');
	log('  5. Publish:           npm publish');
}

async function main(): Promise<void> {
	const startTime = Date.now();

	log('╔════════════════════════════════════════╗', 'bright');
	log('║   Databasin CLI - Production Build     ║', 'bright');
	log('╚════════════════════════════════════════╝', 'bright');

	const options = parseArgs();

	log('\nBuild options:');
	log(`  Skip tests: ${options.skipTests}`);
	log(`  Clean build: ${options.clean}`);
	log(`  Platform: ${options.platform || 'current'}`);
	log(`  Verbose: ${options.verbose}`);

	try {
		// Step 1: Clean
		if (options.clean) {
			await clean();
		}

		// Step 2: Type checking
		await typecheck();

		// Step 3: Tests (optional)
		if (!options.skipTests) {
			await runTests();
		} else {
			logWarning('Skipping tests (--skip-tests flag set)');
		}

		// Step 4: Build JavaScript bundle
		await buildJavaScript();

		// Step 5: Build executable
		await buildExecutable();

		// Step 6: Generate metadata
		await generateMetadata();

		// Step 7: Verify build
		await verifyBuild();

		// Step 8: Copy ./dist to ../static/downloads
		const staticDownloadDir = join(process.cwd(), '..', '..', 'static', 'downloads', 'cli');
		mkdirSync(staticDownloadDir, { recursive: true });
		// Copy only the three directories: linux-x64, darwin-arm64, darwin-x64 to the static downloads folder
		// using fs.cpSync (Node.js 16+)
		const distDir = join(process.cwd(), 'dist');
		const platforms = ['linux-x64', 'darwin-arm64', 'darwin-x64'];
		for (const platform of platforms) {
			const src = join(distDir, platform);
			const dest = join(staticDownloadDir, platform);
			if (existsSync(src)) {
				rmSync(dest, { recursive: true, force: true });
				await cpSync(src, dest, { recursive: true });
				logSuccess(`Copied ${platform} build to static downloads`);
			} else {
				logWarning(`Source directory does not exist: ${src}`);
			}
		}
		logSuccess(`Copied build artifacts to ${staticDownloadDir}`);

		// Step 9: Show summary
		await showBuildSummary();

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		log(`\n✨ Build completed successfully in ${duration}s\n`, 'green');

		process.exit(0);
	} catch (error) {
		const duration = ((Date.now() - startTime) / 1000).toFixed(2);

		logError(`\nBuild failed after ${duration}s\n`);

		if (error instanceof Error) {
			log(error.message, 'red');

			if (options.verbose) {
				log('\nStack trace:', 'red');
				log(error.stack || '', 'red');
			}
		}

		process.exit(1);
	}
}

// Run build
main();
