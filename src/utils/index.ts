/**
 * Utility Functions Index
 *
 * Central export point for all CLI utility modules
 */

// Authentication utilities
export * from './auth';

// Error handling utilities
export * from './errors';

// Progress indicator utilities
export {
	// Spinner functions
	startSpinner,
	updateSpinner,
	succeedSpinner,
	failSpinner,
	warnSpinner,
	// Status messages
	logInfo,
	logSuccess,
	logWarning,
	logError,
	logDebug,
	// Progress tracking
	ProgressTracker,
	// Token warnings
	warnTokenUsage,
	// Duration tracking
	startTimer,
	formatDuration,
	// Utility functions
	divider,
	sectionHeader,
	// Configuration
	setGlobalFlags,
	getGlobalFlags,
	// Types
	type SpinnerOptions,
	type LogOptions,
	type Ora
} from './progress';

// Interactive prompt utilities
export * from './prompts';

// Formatter utilities
export * from './formatters';
