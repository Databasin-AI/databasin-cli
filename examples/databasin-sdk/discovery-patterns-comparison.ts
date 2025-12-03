#!/usr/bin/env bun
/**
 * Discovery Patterns Comparison Example
 *
 * Demonstrates the difference between RDBMS-style and Lakehouse-style
 * schema discovery patterns in the DataBasin CLI.
 *
 * This is a code example - not meant to be executed.
 * Shows how to use both discovery patterns.
 */

import { createSqlClient } from '../../src/client/sql';
import {
  promptForDatabase,
  promptForSchemaInCatalog,
  promptForSchema
} from '../../src/utils/prompts';

const sqlClient = createSqlClient();

/**
 * RDBMS-Style Discovery (Single Phase)
 *
 * For connectors like MySQL, SQLite that return schemas directly.
 * Uses older /api/connector/catalogs/:id endpoint (NO /v2/).
 *
 * Flow: getCatalogsWithSchemas → User selects schema → Done
 */
async function rdbmsStyleDiscovery(connectorId: number) {
  console.log('=== RDBMS-Style Discovery (Single Phase) ===\n');

  // Single API call returns schemas directly
  const response = await sqlClient.getCatalogsWithSchemas(connectorId);

  console.log('Connector:', response.connectorName);
  console.log('Technology:', response.connectorTechnology);
  console.log('Schemas:', response.objects.join(', '));

  // User selects schema from list
  const schema = await promptForSchema(sqlClient, connectorId);

  console.log(`\nSelected schema: ${schema}`);
  console.log(`Full path: ${schema}.table_name`);

  // API Endpoint Used:
  // GET /api/connector/catalogs/:id

  // Response Structure:
  // {
  //   connectorID: 5459,
  //   connectorType: "postgres",
  //   objects: ["public", "config", "information_schema"],  // ← Schemas directly!
  //   connectorTechnology: "postgres"
  // }
}

/**
 * Lakehouse-Style Discovery (Two Phase)
 *
 * For connectors like Postgres, MSSQL, Databricks that require
 * database selection before schema selection.
 * Uses newer /api/v2/connector/catalogs/:id and /api/v2/connector/schemas/:id endpoints.
 *
 * Flow: getCatalogs → User selects database → getSchemas → User selects schema → Done
 */
async function lakehouseStyleDiscovery(connectorId: number) {
  console.log('=== Lakehouse-Style Discovery (Two Phase) ===\n');

  // Phase 1: Database Selection
  console.log('Phase 1: Database Selection');

  const catalogsResponse = await sqlClient.getCatalogs(connectorId);

  console.log('Connector:', catalogsResponse.connectorName);
  console.log('Technology:', catalogsResponse.connectorTechnology);
  console.log('Databases:', catalogsResponse.objects.join(', '));

  // User selects database
  const database = await promptForDatabase(sqlClient, connectorId);
  console.log(`\nSelected database: ${database}\n`);

  // API Endpoint Used:
  // GET /api/v2/connector/catalogs/:id  (← Note /v2/ prefix)

  // Response Structure:
  // {
  //   connectorID: 5459,
  //   connectorType: "RDBMS",
  //   objects: ["postgres", "template0", "template1", "myapp_db"],  // ← Databases!
  //   connectorTechnology: "postgres"
  // }

  // Phase 2: Schema Selection
  console.log('Phase 2: Schema Selection');

  const schemasResponse = await sqlClient.getSchemas(connectorId, database);

  console.log('Catalog:', schemasResponse.schemaCatalogIdentifier);
  console.log('Schemas:', schemasResponse.objects.join(', '));

  // User selects schema
  const schema = await promptForSchemaInCatalog(sqlClient, connectorId, database);

  console.log(`\nSelected schema: ${schema}`);
  console.log(`Full path: ${database}.${schema}.table_name`);

  // API Endpoint Used:
  // GET /api/v2/connector/schemas/:id?catalog=postgres  (← Note /v2/ and catalog param)

  // Response Structure:
  // {
  //   schemaCatalogIdentifier: "postgres",
  //   connectorID: 5459,
  //   connectorType: "RDBMS",
  //   objects: ["public", "information_schema", "pg_catalog"],  // ← Schemas!
  //   connectorTechnology: "postgres"
  // }
}

/**
 * Programmatic Discovery (No Prompts)
 *
 * Shows how to use the methods programmatically without user interaction.
 */
async function programmaticDiscovery(connectorId: number) {
  console.log('=== Programmatic Discovery (No Prompts) ===\n');

  // Get databases
  const catalogsResponse = await sqlClient.getCatalogs(connectorId);
  const databases = catalogsResponse.objects;

  console.log('Available databases:', databases);

  // Select first database programmatically
  const selectedDatabase = databases[0];
  console.log('Selected database:', selectedDatabase);

  // Get schemas for selected database
  const schemasResponse = await sqlClient.getSchemas(connectorId, selectedDatabase);
  const schemas = schemasResponse.objects;

  console.log('Available schemas:', schemas);

  // Select first schema programmatically
  const selectedSchema = schemas[0];
  console.log('Selected schema:', selectedSchema);

  console.log(`\nFull path: ${selectedDatabase}.${selectedSchema}.table_name`);
}

/**
 * Connector Type Detection (Future Enhancement)
 *
 * Shows how to detect which discovery pattern to use based on connector type.
 */
async function autoDetectDiscoveryPattern(connectorId: number) {
  console.log('=== Auto-Detect Discovery Pattern ===\n');

  // Future: Load connector configuration
  // const connectorConfig = await loadConnectorConfig(connectorId);

  // Check pipelineRequiredScreens to determine pattern
  // Screen 1 = RDBMS-style (single phase)
  // Screen 6, 7 = Lakehouse-style (two phase)

  const requiresLakehouseDiscovery = true; // Example: Postgres requires it

  if (requiresLakehouseDiscovery) {
    console.log('Detected: Lakehouse-style connector (Postgres, MSSQL, Databricks)');
    console.log('Using two-phase discovery: Database → Schema');
    await lakehouseStyleDiscovery(connectorId);
  } else {
    console.log('Detected: RDBMS-style connector (MySQL, SQLite)');
    console.log('Using single-phase discovery: Schema only');
    await rdbmsStyleDiscovery(connectorId);
  }
}

/**
 * URL Construction Examples
 */
function showUrlConstructionExamples() {
  console.log('=== URL Construction Examples ===\n');

  const connectorId = 5459;
  const database = 'postgres';

  console.log('RDBMS-Style:');
  console.log(`  GET /api/connector/catalogs/${connectorId}`);
  console.log('  Returns: schemas directly in objects array\n');

  console.log('Lakehouse-Style Phase 1:');
  console.log(`  GET /api/v2/connector/catalogs/${connectorId}`);
  console.log('  Returns: databases in objects array\n');

  console.log('Lakehouse-Style Phase 2:');
  console.log(`  GET /api/v2/connector/schemas/${connectorId}?catalog=${encodeURIComponent(database)}`);
  console.log('  Returns: schemas for selected database in objects array\n');

  console.log('Key Differences:');
  console.log('  • RDBMS uses /api/, Lakehouse uses /api/v2/');
  console.log('  • RDBMS returns schemas, Lakehouse phase 1 returns databases');
  console.log('  • Lakehouse requires catalog parameter for schema lookup');
  console.log('  • URL encoding is critical for special characters in database names');
}

/**
 * Error Handling Examples
 */
async function errorHandlingExamples(connectorId: number) {
  console.log('=== Error Handling Examples ===\n');

  try {
    // Attempt lakehouse discovery
    const response = await sqlClient.getCatalogs(connectorId);

    if (!response.objects || response.objects.length === 0) {
      console.log('No databases available for this connector');
      return;
    }

    const database = await promptForDatabase(sqlClient, connectorId);
    console.log(`Selected database: ${database}`);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Selection cancelled')) {
        console.log('User cancelled selection');
      } else if (error.message.includes('No databases available')) {
        console.log('Connector has no accessible databases');
      } else if (error.message.includes('401') || error.message.includes('403')) {
        console.log('Authentication error - check token');
      } else {
        console.log('Unexpected error:', error.message);
      }
    }
  }
}

// Export examples for documentation
export {
  rdbmsStyleDiscovery,
  lakehouseStyleDiscovery,
  programmaticDiscovery,
  autoDetectDiscoveryPattern,
  showUrlConstructionExamples,
  errorHandlingExamples
};

/**
 * SUMMARY OF DIFFERENCES
 *
 * RDBMS-Style Discovery (Single Phase):
 * ===================================
 * API: GET /api/connector/catalogs/:id
 * Returns: Schemas directly
 * Steps: 1
 * Example connectors: MySQL, SQLite
 *
 * Lakehouse-Style Discovery (Two Phase):
 * =====================================
 * API Phase 1: GET /api/v2/connector/catalogs/:id
 * Returns: Databases
 * API Phase 2: GET /api/v2/connector/schemas/:id?catalog=X
 * Returns: Schemas for selected database
 * Steps: 2
 * Example connectors: Postgres, MSSQL, Databricks
 *
 * Key Implementation Details:
 * =========================
 * • URL encoding: Always use encodeURIComponent() for catalog parameter
 * • Optional catalog: getSchemas() supports optional catalog for some connectors
 * • Backward compatibility: getCatalogsWithSchemas() preserved for RDBMS connectors
 * • Type safety: Full TypeScript types prevent runtime errors
 * • Debug logging: All API calls log to stderr for debugging
 */
