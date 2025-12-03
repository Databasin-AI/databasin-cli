/**
 * Connector Types Tests
 *
 * Comprehensive tests for connector type mapping and artifact type resolution.
 * Ensures all connector subtypes are correctly mapped to artifact type IDs.
 *
 * @module tests/unit/connector-types
 */

import { describe, test, expect } from 'bun:test';
import {
	ConnectorArtifactType,
	getArtifactTypeFromConnectorSubType,
	getArtifactTypeName,
	isValidConnectorSubType,
	getConnectorSubTypesForArtifactType
} from '../../src/client/connector-types.ts';

describe('ConnectorArtifactType Enum', () => {
	test('has correct numeric values', () => {
		expect(ConnectorArtifactType.RDBMS).toBe(1);
		expect(ConnectorArtifactType.BigDataNoSQL).toBe(2);
		expect(ConnectorArtifactType.FileAPI).toBe(3);
		expect(ConnectorArtifactType.CRMERP).toBe(4);
		expect(ConnectorArtifactType.Marketing).toBe(5);
		expect(ConnectorArtifactType.Unknown).toBe(-1);
	});
});

describe('getArtifactTypeFromConnectorSubType', () => {
	describe('RDBMS connectors (Type 1)', () => {
		test('maps postgres correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('postgres')).toBe(
				ConnectorArtifactType.RDBMS
			);
			expect(getArtifactTypeFromConnectorSubType('POSTGRES')).toBe(
				ConnectorArtifactType.RDBMS
			);
			expect(getArtifactTypeFromConnectorSubType('PostgreSQL')).toBe(
				ConnectorArtifactType.RDBMS
			);
		});

		test('maps mysql correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('mysql')).toBe(ConnectorArtifactType.RDBMS);
			expect(getArtifactTypeFromConnectorSubType('MySQL')).toBe(ConnectorArtifactType.RDBMS);
		});

		test('maps mssql correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('mssql')).toBe(ConnectorArtifactType.RDBMS);
			expect(getArtifactTypeFromConnectorSubType('sqlserver')).toBe(
				ConnectorArtifactType.RDBMS
			);
		});

		test('maps oracle correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('oracle')).toBe(
				ConnectorArtifactType.RDBMS
			);
		});

		test('maps other RDBMS correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('mariadb')).toBe(
				ConnectorArtifactType.RDBMS
			);
			expect(getArtifactTypeFromConnectorSubType('db2')).toBe(ConnectorArtifactType.RDBMS);
			expect(getArtifactTypeFromConnectorSubType('sqlite')).toBe(ConnectorArtifactType.RDBMS);
			expect(getArtifactTypeFromConnectorSubType('sybase')).toBe(ConnectorArtifactType.RDBMS);
			expect(getArtifactTypeFromConnectorSubType('teradata')).toBe(
				ConnectorArtifactType.RDBMS
			);
		});
	});

	describe('Big Data & NoSQL connectors (Type 2)', () => {
		test('maps databricks correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('databricks')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('Databricks')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
		});

		test('maps snowflake correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('snowflake')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('SNOWFLAKE')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
		});

		test('maps lakehouse correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('lakehouse')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
		});

		test('maps other big data platforms correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('redshift')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('bigquery')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('athena')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('synapse')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('trino')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('mongodb')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
		});
	});

	describe('File & API connectors (Type 3)', () => {
		test('maps file formats correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('csv')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('CSV')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('json')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('parquet')).toBe(
				ConnectorArtifactType.FileAPI
			);
			expect(getArtifactTypeFromConnectorSubType('avro')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('xml')).toBe(ConnectorArtifactType.FileAPI);
		});

		test('maps file transfer protocols correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('sftp')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('ftp')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('ftps')).toBe(ConnectorArtifactType.FileAPI);
		});

		test('maps cloud storage correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('s3')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('azureblob')).toBe(
				ConnectorArtifactType.FileAPI
			);
			expect(getArtifactTypeFromConnectorSubType('googlecloudstorage')).toBe(
				ConnectorArtifactType.FileAPI
			);
			expect(getArtifactTypeFromConnectorSubType('box')).toBe(ConnectorArtifactType.FileAPI);
			expect(getArtifactTypeFromConnectorSubType('dropbox')).toBe(
				ConnectorArtifactType.FileAPI
			);
		});
	});

	describe('CRM/ERP connectors (Type 4)', () => {
		test('maps salesforce correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('salesforce')).toBe(
				ConnectorArtifactType.CRMERP
			);
			expect(getArtifactTypeFromConnectorSubType('Salesforce')).toBe(
				ConnectorArtifactType.CRMERP
			);
		});

		test('maps dynamics correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('dynamics')).toBe(
				ConnectorArtifactType.CRMERP
			);
			expect(getArtifactTypeFromConnectorSubType('dynamics365')).toBe(
				ConnectorArtifactType.CRMERP
			);
		});

		test('maps other CRM/ERP correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('sap')).toBe(ConnectorArtifactType.CRMERP);
			expect(getArtifactTypeFromConnectorSubType('netsuite')).toBe(
				ConnectorArtifactType.CRMERP
			);
			expect(getArtifactTypeFromConnectorSubType('workday')).toBe(
				ConnectorArtifactType.CRMERP
			);
			expect(getArtifactTypeFromConnectorSubType('servicenow')).toBe(
				ConnectorArtifactType.CRMERP
			);
		});
	});

	describe('Marketing connectors (Type 5)', () => {
		test('maps mailchimp correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('mailchimp')).toBe(
				ConnectorArtifactType.Marketing
			);
		});

		test('maps hubspot correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('hubspot')).toBe(
				ConnectorArtifactType.Marketing
			);
			expect(getArtifactTypeFromConnectorSubType('HubSpot')).toBe(
				ConnectorArtifactType.Marketing
			);
		});

		test('maps analytics platforms correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('googleanalytics')).toBe(
				ConnectorArtifactType.Marketing
			);
			expect(getArtifactTypeFromConnectorSubType('googleads')).toBe(
				ConnectorArtifactType.Marketing
			);
			expect(getArtifactTypeFromConnectorSubType('facebookads')).toBe(
				ConnectorArtifactType.Marketing
			);
		});
	});

	describe('Unknown/invalid types', () => {
		test('returns Unknown for invalid connector types', () => {
			expect(getArtifactTypeFromConnectorSubType('invalid')).toBe(
				ConnectorArtifactType.Unknown
			);
			expect(getArtifactTypeFromConnectorSubType('unknown')).toBe(
				ConnectorArtifactType.Unknown
			);
			expect(getArtifactTypeFromConnectorSubType('foobar')).toBe(
				ConnectorArtifactType.Unknown
			);
		});

		test('handles empty and null values', () => {
			expect(getArtifactTypeFromConnectorSubType('')).toBe(ConnectorArtifactType.Unknown);
			expect(getArtifactTypeFromConnectorSubType('   ')).toBe(ConnectorArtifactType.Unknown);
		});
	});

	describe('case insensitivity', () => {
		test('handles mixed case correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('PoStGrEs')).toBe(
				ConnectorArtifactType.RDBMS
			);
			expect(getArtifactTypeFromConnectorSubType('SnOwFlAkE')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
			expect(getArtifactTypeFromConnectorSubType('CsV')).toBe(ConnectorArtifactType.FileAPI);
		});
	});

	describe('whitespace handling', () => {
		test('trims whitespace correctly', () => {
			expect(getArtifactTypeFromConnectorSubType('  postgres  ')).toBe(
				ConnectorArtifactType.RDBMS
			);
			expect(getArtifactTypeFromConnectorSubType('\tsnowflake\t')).toBe(
				ConnectorArtifactType.BigDataNoSQL
			);
		});
	});
});

describe('getArtifactTypeName', () => {
	test('returns correct names for all types', () => {
		expect(getArtifactTypeName(1)).toBe('RDBMS');
		expect(getArtifactTypeName(2)).toBe('BigDataNoSQL');
		expect(getArtifactTypeName(3)).toBe('FileAPI');
		expect(getArtifactTypeName(4)).toBe('CRMERP');
		expect(getArtifactTypeName(5)).toBe('Marketing');
		expect(getArtifactTypeName(-1)).toBe('Unknown');
	});

	test('returns Unknown for invalid IDs', () => {
		expect(getArtifactTypeName(999)).toBe('Unknown');
		expect(getArtifactTypeName(0)).toBe('Unknown');
	});
});

describe('isValidConnectorSubType', () => {
	test('returns true for valid connector types', () => {
		expect(isValidConnectorSubType('postgres')).toBe(true);
		expect(isValidConnectorSubType('snowflake')).toBe(true);
		expect(isValidConnectorSubType('csv')).toBe(true);
		expect(isValidConnectorSubType('salesforce')).toBe(true);
		expect(isValidConnectorSubType('hubspot')).toBe(true);
	});

	test('returns false for invalid connector types', () => {
		expect(isValidConnectorSubType('invalid')).toBe(false);
		expect(isValidConnectorSubType('')).toBe(false);
		expect(isValidConnectorSubType('unknown')).toBe(false);
	});

	test('is case insensitive', () => {
		expect(isValidConnectorSubType('POSTGRES')).toBe(true);
		expect(isValidConnectorSubType('SnOwFlAkE')).toBe(true);
	});
});

describe('getConnectorSubTypesForArtifactType', () => {
	test('returns all RDBMS subtypes', () => {
		const subtypes = getConnectorSubTypesForArtifactType(ConnectorArtifactType.RDBMS);
		expect(subtypes).toContain('postgres');
		expect(subtypes).toContain('mysql');
		expect(subtypes).toContain('mssql');
		expect(subtypes).toContain('oracle');
		expect(subtypes.length).toBeGreaterThan(5);
	});

	test('returns all BigDataNoSQL subtypes', () => {
		const subtypes = getConnectorSubTypesForArtifactType(ConnectorArtifactType.BigDataNoSQL);
		expect(subtypes).toContain('databricks');
		expect(subtypes).toContain('snowflake');
		expect(subtypes).toContain('lakehouse');
		expect(subtypes.length).toBeGreaterThan(5);
	});

	test('returns all FileAPI subtypes', () => {
		const subtypes = getConnectorSubTypesForArtifactType(ConnectorArtifactType.FileAPI);
		expect(subtypes).toContain('csv');
		expect(subtypes).toContain('json');
		expect(subtypes).toContain('s3');
		expect(subtypes.length).toBeGreaterThan(10);
	});

	test('returns all CRMERP subtypes', () => {
		const subtypes = getConnectorSubTypesForArtifactType(ConnectorArtifactType.CRMERP);
		expect(subtypes).toContain('salesforce');
		expect(subtypes).toContain('dynamics');
		expect(subtypes.length).toBeGreaterThan(3);
	});

	test('returns all Marketing subtypes', () => {
		const subtypes = getConnectorSubTypesForArtifactType(ConnectorArtifactType.Marketing);
		expect(subtypes).toContain('mailchimp');
		expect(subtypes).toContain('hubspot');
		expect(subtypes.length).toBeGreaterThan(3);
	});

	test('returns empty array for Unknown type', () => {
		const subtypes = getConnectorSubTypesForArtifactType(ConnectorArtifactType.Unknown);
		expect(subtypes).toEqual([]);
	});
});
