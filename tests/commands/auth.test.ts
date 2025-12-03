/**
 * Tests for Authentication Commands
 *
 * Verifies:
 * - auth verify: Token validation via /api/ping
 * - auth whoami: Enhanced with account, organizations, and projects
 * - Graceful degradation for partial API failures
 * - Concurrent API execution
 * - Field filtering with nested path support
 * - Error handling and helpful suggestions
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Command } from 'commander';
import { createAuthCommand } from '../../src/commands/auth.ts';
import type { DataBasinClient } from '../../src/client/base.ts';
import type { ProjectsClient } from '../../src/client/projects.ts';
import type { CliConfig } from '../../src/types/config.ts';
import type { User } from '../../src/types/api.ts';

/**
 * Mock user data for testing
 */
const mockUser: User = {
	id: 5,
	email: 'test@example.com',
	firstName: 'John',
	lastName: 'Doe',
	organizationMemberships: [
		{
			organizationId: 1,
			organizationName: 'Acme Corp',
			organizationShortName: 'acme',
			role: 'admin'
		}
	]
};

/**
 * Mock organizations data
 */
const mockOrganizations = [
	{ id: 1, name: 'Acme Corp', shortName: 'acme', enabled: true },
	{ id: 2, name: 'Beta Inc', shortName: 'beta', enabled: true }
];

/**
 * Mock projects data
 */
const mockProjects = [
	{
		id: 123,
		projectId: 123,
		name: 'Production',
		projectName: 'Production',
		internalID: 'N1r8Do',
		organizationId: 1,
		institutionID: 1,
		deleted: false
	},
	{
		id: 456,
		projectId: 456,
		name: 'Development',
		projectName: 'Development',
		internalID: 'X9k2Lp',
		organizationId: 1,
		institutionID: 1,
		deleted: false
	}
];

/**
 * Mock DataBasin client
 */
class MockDataBasinClient {
	public shouldFailPing = false;

	async ping(): Promise<boolean> {
		if (this.shouldFailPing) {
			throw new Error('API connection failed');
		}
		return true;
	}

	async get(endpoint: string): Promise<any> {
		return {};
	}

	getBaseUrl(): string {
		return 'http://localhost:9000';
	}
}

/**
 * Mock Projects client
 */
class MockProjectsClient {
	public shouldFailUser = false;
	public shouldFailOrgs = false;
	public shouldFailProjects = false;

	async getCurrentUser(): Promise<User> {
		if (this.shouldFailUser) {
			throw new Error('Failed to fetch user');
		}
		return mockUser;
	}

	async listOrganizations(): Promise<any[]> {
		if (this.shouldFailOrgs) {
			throw new Error('Failed to fetch organizations');
		}
		return mockOrganizations;
	}

	async list(): Promise<any[]> {
		if (this.shouldFailProjects) {
			throw new Error('Failed to fetch projects');
		}
		return mockProjects;
	}
}

/**
 * Helper to create mock program context
 */
function createMockProgram(): {
	program: Command;
	mockBaseClient: MockDataBasinClient;
	mockProjectsClient: MockProjectsClient;
} {
	const mockConfig: CliConfig = {
		apiUrl: 'http://localhost:9000',
		webUrl: 'http://localhost:3000',
		timeout: 30000,
		debug: false,
		output: {
			format: 'json',
			colors: false,
			pretty: true
		},
		tokenEfficiency: {
			warnThreshold: 50000,
			defaultCount: false,
			defaultLimit: null
		}
	};

	const mockBaseClient = new MockDataBasinClient();
	const mockProjectsClient = new MockProjectsClient();

	const program = new Command();
	program.setOptionValue('_config', mockConfig);
	program.setOptionValue('_clients', {
		base: mockBaseClient,
		projects: mockProjectsClient
	});

	return { program, mockBaseClient, mockProjectsClient };
}

/**
 * Helper to execute command and capture any thrown errors
 */
async function executeCommand(fn: () => Promise<void>): Promise<void> {
	return fn();
}

describe('Auth Commands', () => {
	beforeEach(() => {
		process.env.DATABASIN_TOKEN = 'test-jwt-token';
	});

	afterEach(() => {
		delete process.env.DATABASIN_TOKEN;
	});

	describe('Command Structure', () => {
		it('should create auth command group', () => {
			const authCommand = createAuthCommand();
			expect(authCommand.name()).toBe('auth');
		});

		it('should have verify subcommand', () => {
			const authCommand = createAuthCommand();
			const subcommands = authCommand.commands;
			const verifyCmd = subcommands.find((cmd) => cmd.name() === 'verify');
			expect(verifyCmd).toBeDefined();
		});

		it('should have whoami subcommand', () => {
			const authCommand = createAuthCommand();
			const subcommands = authCommand.commands;
			const whoamiCmd = subcommands.find((cmd) => cmd.name() === 'whoami');
			expect(whoamiCmd).toBeDefined();
		});

		it('should have login subcommand', () => {
			const authCommand = createAuthCommand();
			const subcommands = authCommand.commands;
			const loginCmd = subcommands.find((cmd) => cmd.name() === 'login');
			expect(loginCmd).toBeDefined();
		});
	});

	describe('verify command', () => {
		it('should call ping endpoint', async () => {
			const { program, mockBaseClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			let pingCalled = false;
			mockBaseClient.ping = async () => {
				pingCalled = true;
				return true;
			};

			// Suppress console output
			const originalLog = console.log;
			console.log = () => {};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'verify']);
				});
			} finally {
				console.log = originalLog;
			}

			expect(pingCalled).toBe(true);
		});

		it('should return on success without throwing', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			// Suppress console output (both log and error)
			const originalLog = console.log;
			const originalError = console.error;
			console.log = () => {};
			console.error = () => {};

			try {
				// Should not throw on success
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'verify']);
				});
			} finally {
				console.log = originalLog;
				console.error = originalError;
			}
		});

		it('should throw error when token is invalid', async () => {
			const { program, mockBaseClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			mockBaseClient.shouldFailPing = true;

			// Suppress console output
			const originalLog = console.log;
			const originalError = console.error;
			console.log = () => {};
			console.error = () => {};

			try {
				await expect(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'verify']);
				}).toThrow();
			} finally {
				console.log = originalLog;
				console.error = originalError;
			}
		});
	});

	describe('whoami command - default behavior', () => {
		it('should return account, organizations, and projects by default', async () => {
			const { program, mockProjectsClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			let getUserCalled = false;
			let getOrgsCalled = false;
			let getProjectsCalled = false;

			mockProjectsClient.getCurrentUser = async () => {
				getUserCalled = true;
				return mockUser;
			};

			mockProjectsClient.listOrganizations = async () => {
				getOrgsCalled = true;
				return mockOrganizations;
			};

			mockProjectsClient.list = async () => {
				getProjectsCalled = true;
				return mockProjects;
			};

			// Suppress console output
			const originalLog = console.log;
			console.log = () => {};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			expect(getUserCalled).toBe(true);
			expect(getOrgsCalled).toBe(true);
			expect(getProjectsCalled).toBe(true);
		});

		it('should make API calls concurrently', async () => {
			const { program, mockProjectsClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			const delays: number[] = [];
			const startTime = Date.now();

			mockProjectsClient.getCurrentUser = async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				delays.push(Date.now() - startTime);
				return mockUser;
			};

			mockProjectsClient.listOrganizations = async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				delays.push(Date.now() - startTime);
				return mockOrganizations;
			};

			mockProjectsClient.list = async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				delays.push(Date.now() - startTime);
				return mockProjects;
			};

			// Suppress console output
			const originalLog = console.log;
			console.log = () => {};

			const testStartTime = Date.now();

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			const totalDuration = Date.now() - testStartTime;

			// Should complete in ~100ms (concurrent) not ~300ms (sequential)
			expect(totalDuration).toBeLessThan(250);
		});
	});

	describe('whoami command - graceful degradation', () => {
		it('should gracefully degrade if organizations call fails', async () => {
			const { program, mockProjectsClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			mockProjectsClient.shouldFailOrgs = true;

			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			// Should still return account and projects
			expect(output).toContain('account');
			expect(output).toContain('projects');
		});

		it('should gracefully degrade if projects call fails', async () => {
			const { program, mockProjectsClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			mockProjectsClient.shouldFailProjects = true;

			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			// Should still return account and organizations
			expect(output).toContain('account');
			expect(output).toContain('organizations');
		});

		it('should fail if account call fails', async () => {
			const { program, mockProjectsClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			mockProjectsClient.shouldFailUser = true;

			// Suppress console output
			const originalLog = console.log;
			const originalError = console.error;
			console.log = () => {};
			console.error = () => {};

			try {
				await expect(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				}).toThrow();
			} finally {
				console.log = originalLog;
				console.error = originalError;
			}
		});
	});

	describe('whoami command - field filtering', () => {
		it('should handle --fields filtering with nested paths', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			// Suppress console output and capture
			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync([
						'node',
						'test',
						'auth',
						'whoami',
						'--fields',
						'account.email'
					]);
				});
			} finally {
				console.log = originalLog;
			}

			// Output should contain email but be filtered
			expect(output).toContain('email');
		});

		it('should handle simple field filtering', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync([
						'node',
						'test',
						'auth',
						'whoami',
						'--fields',
						'account,projects'
					]);
				});
			} finally {
				console.log = originalLog;
			}

			expect(output).toContain('account');
			expect(output).toContain('projects');
		});

		it('should handle mixed field filtering (simple + nested)', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync([
						'node',
						'test',
						'auth',
						'whoami',
						'--fields',
						'account.email,organizations'
					]);
				});
			} finally {
				console.log = originalLog;
			}

			expect(output).toContain('email');
			expect(output).toContain('organizations');
		});
	});

	describe('whoami command - data structure', () => {
		it('should structure account data correctly', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			// Should contain account fields
			expect(output).toContain('test@example.com');
			expect(output).toContain('John');
			expect(output).toContain('Doe');
		});

		it('should structure organizations data correctly', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			// Should contain organization names
			expect(output).toContain('Acme Corp');
			expect(output).toContain('Beta Inc');
		});

		it('should structure projects data correctly', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			let output = '';
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				output += args.join(' ') + '\n';
			};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			// Should contain project names and internal IDs
			expect(output).toContain('Production');
			expect(output).toContain('Development');
			expect(output).toContain('N1r8Do');
			expect(output).toContain('X9k2Lp');
		});
	});

	describe('Edge Cases', () => {
		it('should handle user with no organizations', async () => {
			const { program, mockProjectsClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			mockProjectsClient.listOrganizations = async () => [];

			const originalLog = console.log;
			console.log = () => {};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			// Should not throw
		});

		it('should handle user with no projects', async () => {
			const { program, mockProjectsClient } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			mockProjectsClient.list = async () => [];

			const originalLog = console.log;
			console.log = () => {};

			try {
				await executeCommand(async () => {
					await program.parseAsync(['node', 'test', 'auth', 'whoami']);
				});
			} finally {
				console.log = originalLog;
			}

			// Should not throw
		});

		it('should handle invalid field names gracefully', async () => {
			const { program } = createMockProgram();
			const authCommand = createAuthCommand();
			program.addCommand(authCommand);

			const originalLog = console.log;
			console.log = () => {};

			try {
				await executeCommand(async () => {
					await program.parseAsync([
						'node',
						'test',
						'auth',
						'whoami',
						'--fields',
						'nonexistent.field'
					]);
				});
			} finally {
				console.log = originalLog;
			}

			// Should not throw, just return empty or filtered result
		});
	});
});
