import { gql } from '@apollo/client';

import {
  GetCurrentUserDocument,
  GetUserReportsDocument,
  GetReportByCodeDocument,
} from './reports.generated';

describe('GraphQL Query Documents', () => {
  describe('GetCurrentUserDocument', () => {
    it('should be a valid GraphQL document', () => {
      expect(GetCurrentUserDocument).toBeDefined();
      expect(GetCurrentUserDocument.kind).toBe('Document');
    });

    it('should query for current user data', () => {
      const queryString = GetCurrentUserDocument.loc?.source.body;
      expect(queryString).toContain('query getCurrentUser');
      expect(queryString).toContain('userData');
      expect(queryString).toContain('currentUser');
      expect(queryString).toContain('id');
      expect(queryString).toContain('name');
      expect(queryString).toContain('naDisplayName');
      expect(queryString).toContain('euDisplayName');
    });
  });

  describe('GetUserReportsDocument', () => {
    it('should be a valid GraphQL document', () => {
      expect(GetUserReportsDocument).toBeDefined();
      expect(GetUserReportsDocument.kind).toBe('Document');
    });

    it('should query for user reports with pagination and filtering', () => {
      const queryString = GetUserReportsDocument.loc?.source.body;
      expect(queryString).toContain('query getUserReports');
      expect(queryString).toContain('$limit: Int');
      expect(queryString).toContain('$page: Int');
      expect(queryString).toContain('$userID: Int');
      expect(queryString).toContain('reportData');
      expect(queryString).toContain('reports(limit: $limit, page: $page, userID: $userID)');
    });

    it('should include pagination fields', () => {
      const queryString = GetUserReportsDocument.loc?.source.body;
      expect(queryString).toContain('total');
      expect(queryString).toContain('current_page');
      expect(queryString).toContain('per_page');
      expect(queryString).toContain('last_page');
      expect(queryString).toContain('has_more_pages');
    });

    it('should include UserReportSummary fragment fields', () => {
      const queryString = GetUserReportsDocument.loc?.source.body;
      expect(queryString).toContain('...UserReportSummary');
      expect(queryString).toContain('code');
      expect(queryString).toContain('startTime');
      expect(queryString).toContain('endTime');
      expect(queryString).toContain('title');
      expect(queryString).toContain('visibility');
      expect(queryString).toContain('zone');
      expect(queryString).toContain('owner');
    });
  });

  describe('GetReportByCodeDocument', () => {
    it('should be a valid GraphQL document', () => {
      expect(GetReportByCodeDocument).toBeDefined();
      expect(GetReportByCodeDocument.kind).toBe('Document');
    });

    it('should query for specific report by code', () => {
      const queryString = GetReportByCodeDocument.loc?.source.body;
      expect(queryString).toContain('query getReportByCode');
      expect(queryString).toContain('$code: String!');
      expect(queryString).toContain('reportData');
      expect(queryString).toContain('report(code: $code)');
    });

    it('should include Report fragment with fights', () => {
      const queryString = GetReportByCodeDocument.loc?.source.body;
      expect(queryString).toContain('...Report');
      expect(queryString).toContain('fights');
    });
  });

  describe('Fragment consistency', () => {
    it('should have consistent UserReportSummary fragment structure', () => {
      const queryString = GetUserReportsDocument.loc?.source.body;

      // Should include all necessary fields for the reports table
      expect(queryString).toContain('code');
      expect(queryString).toContain('startTime');
      expect(queryString).toContain('endTime');
      expect(queryString).toContain('title');
      expect(queryString).toContain('visibility');

      // Should include zone information
      expect(queryString).toContain('zone');
      expect(queryString).toContain('name');

      // Should include owner information
      expect(queryString).toContain('owner');
    });

    it('should have Report fragment that includes fights', () => {
      const queryString = GetReportByCodeDocument.loc?.source.body;

      // Should include basic report fields
      expect(queryString).toContain('code');
      expect(queryString).toContain('startTime');
      expect(queryString).toContain('endTime');
      expect(queryString).toContain('title');
      expect(queryString).toContain('visibility');

      // Should include fights for detailed analysis
      expect(queryString).toContain('fights');
      expect(queryString).toContain('...Fight');
    });
  });

  describe('Variable usage validation', () => {
    it('should properly define variables for getUserReports query', () => {
      const definitions = GetUserReportsDocument.definitions;
      const operationDefinition = definitions.find((def) => def.kind === 'OperationDefinition');

      expect(operationDefinition).toBeDefined();
      if (operationDefinition && operationDefinition.kind === 'OperationDefinition') {
        const variables = operationDefinition.variableDefinitions;
        expect(variables).toBeDefined();

        const variableNames = variables?.map((v) => v.variable.name.value) || [];

        expect(variableNames).toContain('limit');
        expect(variableNames).toContain('page');
        expect(variableNames).toContain('userID');
      }
    });

    it('should properly define variables for getReportByCode query', () => {
      const definitions = GetReportByCodeDocument.definitions;
      const operationDefinition = definitions.find((def) => def.kind === 'OperationDefinition');

      expect(operationDefinition).toBeDefined();
      if (operationDefinition && operationDefinition.kind === 'OperationDefinition') {
        const variables = operationDefinition.variableDefinitions;
        expect(variables).toBeDefined();

        const variableNames = variables?.map((v) => v.variable.name.value) || [];

        expect(variableNames).toContain('code');
      }
    });

    it('should not require variables for getCurrentUser query', () => {
      const definitions = GetCurrentUserDocument.definitions;
      const operationDefinition = definitions.find((def) => def.kind === 'OperationDefinition');

      expect(operationDefinition).toBeDefined();
      if (operationDefinition && operationDefinition.kind === 'OperationDefinition') {
        const variables = operationDefinition.variableDefinitions;
        expect(variables).toEqual([]);
      }
    });
  });
});
