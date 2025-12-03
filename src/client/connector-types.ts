/**
 * Connector Type Mapping for Databasin CLI
 *
 * Maps connector subtypes to artifact type IDs used by the backend API.
 * This module provides type-safe conversion from connector subtype strings
 * (e.g., "postgres", "snowflake") to numeric artifact type IDs.
 *
 * Based on frontend implementation:
 * @see /home/founder3/code/tpi/databasin-sv/src/lib/system/ConfigurationApiClient.js:249-290
 *
 * @module client/connector-types
 */

/**
 * Connector Artifact Type IDs
 *
 * Numeric identifiers used by the Databasin backend to categorize connectors.
 * Each connector belongs to one of these types which determines:
 * - Available artifact configurations
 * - Supported data formats
 * - Pipeline wizard screens and options
 */
export enum ConnectorArtifactType {
	/** Relational Database Management Systems (PostgreSQL, MySQL, SQL Server, etc.) */
	RDBMS = 1,

	/** Big Data and NoSQL databases (Databricks, Snowflake, Redshift, etc.) */
	BigDataNoSQL = 2,

	/** File storage and APIs (CSV, JSON, SFTP, S3, etc.) */
	FileAPI = 3,

	/** Customer Relationship Management and ERP systems (Salesforce, Dynamics, etc.) */
	CRMERP = 4,

	/** Marketing platforms and analytics (HubSpot, Mailchimp, Google Analytics, etc.) */
	Marketing = 5,

	/** Unknown or unsupported connector type */
	Unknown = -1
}

/**
 * Complete mapping of connector subtypes to artifact type IDs
 *
 * This mapping MUST match the frontend configuration exactly.
 * Case-insensitive matching is performed automatically.
 *
 * @internal
 */
const CONNECTOR_TYPE_MAP: Record<string, ConnectorArtifactType> = {
	// RDBMS - Relational Databases (Type 1)
	postgres: ConnectorArtifactType.RDBMS,
	postgresql: ConnectorArtifactType.RDBMS,
	mysql: ConnectorArtifactType.RDBMS,
	mssql: ConnectorArtifactType.RDBMS,
	sqlserver: ConnectorArtifactType.RDBMS,
	oracle: ConnectorArtifactType.RDBMS,
	mariadb: ConnectorArtifactType.RDBMS,
	db2: ConnectorArtifactType.RDBMS,
	sqlite: ConnectorArtifactType.RDBMS,
	sybase: ConnectorArtifactType.RDBMS,
	teradata: ConnectorArtifactType.RDBMS,

	// Big Data & NoSQL (Type 2)
	databricks: ConnectorArtifactType.BigDataNoSQL,
	snowflake: ConnectorArtifactType.BigDataNoSQL,
	lakehouse: ConnectorArtifactType.BigDataNoSQL,
	redshift: ConnectorArtifactType.BigDataNoSQL,
	bigquery: ConnectorArtifactType.BigDataNoSQL,
	athena: ConnectorArtifactType.BigDataNoSQL,
	synapse: ConnectorArtifactType.BigDataNoSQL,
	trino: ConnectorArtifactType.BigDataNoSQL,
	presto: ConnectorArtifactType.BigDataNoSQL,
	hive: ConnectorArtifactType.BigDataNoSQL,
	cassandra: ConnectorArtifactType.BigDataNoSQL,
	mongodb: ConnectorArtifactType.BigDataNoSQL,

	// File & API (Type 3)
	csv: ConnectorArtifactType.FileAPI,
	json: ConnectorArtifactType.FileAPI,
	parquet: ConnectorArtifactType.FileAPI,
	avro: ConnectorArtifactType.FileAPI,
	orc: ConnectorArtifactType.FileAPI,
	xml: ConnectorArtifactType.FileAPI,
	excel: ConnectorArtifactType.FileAPI,
	sftp: ConnectorArtifactType.FileAPI,
	ftp: ConnectorArtifactType.FileAPI,
	ftps: ConnectorArtifactType.FileAPI,
	box: ConnectorArtifactType.FileAPI,
	s3: ConnectorArtifactType.FileAPI,
	azureblob: ConnectorArtifactType.FileAPI,
	azuredatalakestorage: ConnectorArtifactType.FileAPI,
	azuredatalakestoragegen2: ConnectorArtifactType.FileAPI,
	googlecloudstorage: ConnectorArtifactType.FileAPI,
	googledrive: ConnectorArtifactType.FileAPI,
	onedrive: ConnectorArtifactType.FileAPI,
	sharepoint: ConnectorArtifactType.FileAPI,
	dropbox: ConnectorArtifactType.FileAPI,

	// CRM/ERP (Type 4)
	salesforce: ConnectorArtifactType.CRMERP,
	dynamics: ConnectorArtifactType.CRMERP,
	dynamics365: ConnectorArtifactType.CRMERP,
	sap: ConnectorArtifactType.CRMERP,
	netsuite: ConnectorArtifactType.CRMERP,
	oracle_erp: ConnectorArtifactType.CRMERP,
	workday: ConnectorArtifactType.CRMERP,
	servicenow: ConnectorArtifactType.CRMERP,
	zendesk: ConnectorArtifactType.CRMERP,
	jira: ConnectorArtifactType.CRMERP,

	// Marketing (Type 5)
	mailchimp: ConnectorArtifactType.Marketing,
	hubspot: ConnectorArtifactType.Marketing,
	googleanalytics: ConnectorArtifactType.Marketing,
	googleads: ConnectorArtifactType.Marketing,
	facebookads: ConnectorArtifactType.Marketing,
	linkedinads: ConnectorArtifactType.Marketing,
	marketo: ConnectorArtifactType.Marketing,
	pardot: ConnectorArtifactType.Marketing,
	klaviyo: ConnectorArtifactType.Marketing,
	sendgrid: ConnectorArtifactType.Marketing
};

/**
 * Get artifact type ID from connector subtype string
 *
 * Performs case-insensitive matching against the known connector types.
 * Returns Unknown (-1) for unrecognized connector subtypes.
 *
 * @param subType - Connector subtype string (e.g., "postgres", "Snowflake", "CSV")
 * @returns Artifact type ID or Unknown (-1) if not found
 *
 * @example
 * ```typescript
 * getArtifactTypeFromConnectorSubType('postgres')     // Returns: 1 (RDBMS)
 * getArtifactTypeFromConnectorSubType('SNOWFLAKE')   // Returns: 2 (BigDataNoSQL)
 * getArtifactTypeFromConnectorSubType('csv')         // Returns: 3 (FileAPI)
 * getArtifactTypeFromConnectorSubType('salesforce')  // Returns: 4 (CRMERP)
 * getArtifactTypeFromConnectorSubType('hubspot')     // Returns: 5 (Marketing)
 * getArtifactTypeFromConnectorSubType('unknown')     // Returns: -1 (Unknown)
 * ```
 */
export function getArtifactTypeFromConnectorSubType(subType: string): ConnectorArtifactType {
	if (!subType || typeof subType !== 'string') {
		return ConnectorArtifactType.Unknown;
	}

	// Normalize to lowercase and trim whitespace
	const normalized = subType.toLowerCase().trim();

	// Lookup in map, return Unknown if not found
	return CONNECTOR_TYPE_MAP[normalized] ?? ConnectorArtifactType.Unknown;
}

/**
 * Get artifact type name from ID
 *
 * Converts numeric artifact type ID back to human-readable name.
 * Useful for logging and error messages.
 *
 * @param artifactTypeId - Numeric artifact type ID
 * @returns Human-readable type name
 *
 * @example
 * ```typescript
 * getArtifactTypeName(1)  // Returns: "RDBMS"
 * getArtifactTypeName(2)  // Returns: "BigDataNoSQL"
 * getArtifactTypeName(-1) // Returns: "Unknown"
 * ```
 */
export function getArtifactTypeName(artifactTypeId: number): string {
	switch (artifactTypeId) {
		case ConnectorArtifactType.RDBMS:
			return 'RDBMS';
		case ConnectorArtifactType.BigDataNoSQL:
			return 'BigDataNoSQL';
		case ConnectorArtifactType.FileAPI:
			return 'FileAPI';
		case ConnectorArtifactType.CRMERP:
			return 'CRMERP';
		case ConnectorArtifactType.Marketing:
			return 'Marketing';
		default:
			return 'Unknown';
	}
}

/**
 * Check if connector subtype is valid/known
 *
 * @param subType - Connector subtype string
 * @returns True if the subtype is recognized
 *
 * @example
 * ```typescript
 * isValidConnectorSubType('postgres')   // Returns: true
 * isValidConnectorSubType('unknown')    // Returns: false
 * ```
 */
export function isValidConnectorSubType(subType: string): boolean {
	return getArtifactTypeFromConnectorSubType(subType) !== ConnectorArtifactType.Unknown;
}

/**
 * Get all supported connector subtypes for an artifact type
 *
 * Returns array of connector subtype strings that belong to the specified artifact type.
 * Useful for validation and documentation.
 *
 * @param artifactType - Artifact type ID
 * @returns Array of connector subtype strings
 *
 * @example
 * ```typescript
 * getConnectorSubTypesForArtifactType(ConnectorArtifactType.RDBMS)
 * // Returns: ['postgres', 'mysql', 'mssql', ...]
 * ```
 */
export function getConnectorSubTypesForArtifactType(
	artifactType: ConnectorArtifactType
): string[] {
	return Object.entries(CONNECTOR_TYPE_MAP)
		.filter(([_, typeId]) => typeId === artifactType)
		.map(([subType, _]) => subType);
}

/**
 * Check if connector type is RDBMS (Relational Database Management System)
 *
 * @param connectorType - Connector type string
 * @returns True if connector is RDBMS type
 *
 * @example
 * ```typescript
 * isRDBMS('postgres')    // Returns: true
 * isRDBMS('snowflake')   // Returns: false
 * ```
 */
export function isRDBMS(connectorType: string): boolean {
	const artifactType = getArtifactTypeFromConnectorSubType(connectorType);
	return artifactType === ConnectorArtifactType.RDBMS;
}

/**
 * Check if connector type is BigDataNoSQL (lakehouse/warehouse)
 *
 * @param connectorType - Connector type string
 * @returns True if connector is BigDataNoSQL type
 *
 * @example
 * ```typescript
 * isBigDataNoSQL('databricks')  // Returns: true
 * isBigDataNoSQL('postgres')    // Returns: false
 * ```
 */
export function isBigDataNoSQL(connectorType: string): boolean {
	const artifactType = getArtifactTypeFromConnectorSubType(connectorType);
	return artifactType === ConnectorArtifactType.BigDataNoSQL;
}
