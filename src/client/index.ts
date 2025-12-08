/**
 * Databasin CLI - Client Library
 * Barrel export for all API clients
 */

// Base client
export {
	DatabasinClient,
	createClient,
	type RequestOptions,
	type TokenEfficiencyOptions,
	type ResponseMetadata
} from './base.ts';

// Resource clients
export { ProjectsClient, createProjectsClient } from './projects.ts';
export {
	ConnectorsClient,
	createConnectorsClient,
	type ConnectorListOptions
} from './connectors.ts';
export { PipelinesClient, createPipelinesClient } from './pipelines.ts';
export { AutomationsClient, createAutomationsClient } from './automations.ts';
export { SqlClient, createSqlClient } from './sql.ts';
export { ConfigurationClient, createConfigurationClient } from './configuration.ts';

// Import createClient locally for use in createAllClients
import { createClient } from './base.ts';
import { createProjectsClient } from './projects.ts';
import { createConnectorsClient } from './connectors.ts';
import { createPipelinesClient } from './pipelines.ts';
import { createAutomationsClient } from './automations.ts';
import { createSqlClient } from './sql.ts';
import { createConfigurationClient } from './configuration.ts';

// Convenience: Create all clients at once
export function createAllClients(config?: import('../types/config.ts').CliConfig) {
	return {
		base: createClient(config),
		projects: createProjectsClient(),
		connectors: createConnectorsClient(),
		pipelines: createPipelinesClient(),
		automations: createAutomationsClient(),
		sql: createSqlClient(),
		configuration: createConfigurationClient()
	};
}
