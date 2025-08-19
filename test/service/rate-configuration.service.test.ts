import RateConfigurationService from '../../src/service/rate-configuration.service';
import RateConfigurationsModel from '../../src/models/rate-configurations.model';
import RateConfigurationHierarchies from '../../src/models/rate_configuration_hierarchies.model';
import RateConfigurationJobTemplates from '../../src/models/rate-configuration-job-templates.model';
import RateConfigurationBaseRateTypes from '../../src/models/rate-configuration-base-rate-types.model';
import RateConfigurationRateTypes from '../../src/models/rate-configuration-rate-types.model';
import RateConfigurationRateDifferentials from '../../src/models/rate-configuration-rate-differentials.model';
import RateConfigurationExpenses from '../../src/models/rate-configuration-expenses.model';
import RateConfigurationsRepository from '../../src/repositories/rate-configurations.repository';
import ShiftType from '../../src/models/shift-type.model';
import hierarchies from '../../src/models/hierarchies.model';
import jobTemplateModel from '../../src/models/job-template.model';
import rateType from '../../src/models/rate-type.model';
import picklistItemModel from '../../src/models/picklist-item.model';
import ExpenseTypeModel from '../../src/models/expense-type.model';
import shiftTypeConfiguration from '../../src/models/shift-type-configuration.model';
import { sequelize } from '../../src/config/instance';
import generateCustomUUID from '../../src/utility/genrateTraceId';
import { QueryTypes, Op } from 'sequelize';

// Mock all the models and dependencies
jest.mock('../../src/models/rate-configurations.model', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../src/models/rate_configuration_hierarchies.model', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../src/models/rate-configuration-job-templates.model', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../src/models/rate-configuration-base-rate-types.model', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
  upsert: jest.fn(),
}));

jest.mock('../../src/models/rate-configuration-rate-types.model', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
  upsert: jest.fn(),
}));

jest.mock('../../src/models/rate-configuration-rate-differentials.model', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
  upsert: jest.fn(),
}));

jest.mock('../../src/models/rate-configuration-expenses.model', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../src/models/hierarchies.model', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/models/job-template.model', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/models/rate-type.model', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/models/picklist-item.model', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../src/models/expense-type.model', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/models/shift-type.model', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/models/shift-type-configuration.model', () => ({}));

jest.mock('../../src/repositories/rate-configurations.repository', () => ({
  getRateConfigurationsByProgramId: jest.fn(),
}));

jest.mock('../../src/config/instance', () => ({
  sequelize: {
    query: jest.fn(),
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../../src/utility/genrateTraceId', () => jest.fn(() => 'mock-trace-id'));

jest.mock('../../src/utility/queries', () => ({
  sameHierarchieRateConfiguration: 'SELECT * FROM mock_query',
  sameRateConfiguration: 'SELECT * FROM mock_query',
  getAllRateConfigurationsQuery: jest.fn(() => Promise.resolve([])),
  rateCardMinRateMaxRate: 'SELECT * FROM mock_query',
  rateConfigHierarchiesAndJobTemplates: 'SELECT * FROM mock_query',
  rateConfigurationsFilterQuery: jest.fn(() => 'SELECT * FROM mock_query'),
}));

describe('RateConfigurationService', () => {
  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
    (generateCustomUUID as jest.Mock).mockReturnValue('mock-trace-id');
  });

  describe('createRateConfigurations', () => {
    const mockProgramId = 'program-123';
    const mockUserId = 'user-456';
    const mockPayload = {
      name: 'Test Rate Configuration',
      is_shift_rate: true,
      job_type: 'contract',
      hierarchies: ['hierarchy-1', 'hierarchy-2'],
      job_templates: ['job-template-1', 'job-template-2'],
      expenses: [
        {
          expense_type_id: 'expense-1',
          unit_of_measure: 'hour',
          unit_lable: 'Hour',
          rate: 10.50,
          max_limit: 1000,
        },
      ],
      rate_configuration: [
        {
          base_rate: {
            rate_type_id: 'rate-type-1',
            seq_number: 1,
          },
          rate: [
            {
              rate_type_id: 'rate-type-2',
              seq_number: 1,
              bill_rate: [
                {
                  differential_on: 'base',
                  differential_type: 'Fixed Differential',
                  differential_value: 5.0,
                  unit_of_measure: 'hour',
                  currency: 'USD',
                },
              ],
              pay_rate: [
                {
                  differential_on: 'base',
                  differential_type: 'Factor Differential',
                  differential_value: 1.2,
                  unit_of_measure: 'hour',
                  currency: 'USD',
                },
              ],
            },
          ],
        },
      ],
    };

    it('should successfully create a rate configuration with all components', async () => {
      const mockRateData = { id: 'rate-config-123' };
      const mockBaseRateResult = { id: 'base-rate-123' };
      const mockRateTypeRecord = { id: 'rate-type-record-123' };

      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationsModel.create as jest.Mock).mockResolvedValue(mockRateData);
      (RateConfigurationHierarchies.create as jest.Mock).mockResolvedValue({});
      (RateConfigurationJobTemplates.create as jest.Mock).mockResolvedValue({});
      (RateConfigurationExpenses.create as jest.Mock).mockResolvedValue({});
      (RateConfigurationBaseRateTypes.create as jest.Mock).mockResolvedValue(mockBaseRateResult);
      (RateConfigurationRateTypes.create as jest.Mock).mockResolvedValue(mockRateTypeRecord);
      (RateConfigurationRateDifferentials.create as jest.Mock).mockResolvedValue({});

      const result = await RateConfigurationService.createRateConfigurations(
        mockProgramId,
        mockPayload,
        mockUserId
      );

      expect(result.status_code).toBe(201);
      expect(result.message).toBe('Rate configurations created successfully.');
      expect(result.rate_type_category_id).toBe(mockRateData.id);
      expect(result.trace_id).toBe('mock-trace-id');
      
      expect(RateConfigurationsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          program_id: mockProgramId,
          name: mockPayload.name,
          is_shift_rate: mockPayload.is_shift_rate,
          job_type: mockPayload.job_type,
          created_by: mockUserId,
          updated_by: mockUserId,
        }),
        { transaction: mockTransaction }
      );
      
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw error when duplicate configuration exists', async () => {
      const duplicateConfig = [{ id: 'existing-config' }];
      (sequelize.query as jest.Mock).mockResolvedValue(duplicateConfig);

      const result = await RateConfigurationService.createRateConfigurations(
        mockProgramId,
        mockPayload,
        mockUserId
      );

      expect(result).toEqual({
        status_code: 409,
        message: 'Rate configurations with the same hierarchy job template and job type already exist.',
        trace_id: 'mock-trace-id',
      });
    });

    it('should handle database errors and rollback transaction', async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationsModel.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        RateConfigurationService.createRateConfigurations(
          mockProgramId,
          mockPayload,
          mockUserId
        )
      ).rejects.toEqual({
        status: 500,
        message: 'Database error',
        error: 'Database error',
        trace_id: 'mock-trace-id',
      });

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should skip empty hierarchies and job templates', async () => {
      const payloadWithEmpties = {
        ...mockPayload,
        hierarchies: ['hierarchy-1', '', null, 'hierarchy-2'],
        job_templates: ['', 'job-template-1', null, 'job-template-2'],
      };

      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'rate-config-123' });
      (RateConfigurationBaseRateTypes.create as jest.Mock).mockResolvedValue({ id: 'base-rate-123' });

      await RateConfigurationService.createRateConfigurations(
        mockProgramId,
        payloadWithEmpties,
        mockUserId
      );

      // Should only create for valid hierarchies and job templates
      expect(RateConfigurationHierarchies.create).toHaveBeenCalledTimes(2);
      expect(RateConfigurationJobTemplates.create).toHaveBeenCalledTimes(2);
    });

    it('should create configuration without optional components', async () => {
      const minimalPayload = {
        name: 'Minimal Configuration',
        is_shift_rate: false,
      };

      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'minimal-config' });

      const result = await RateConfigurationService.createRateConfigurations(
        mockProgramId,
        minimalPayload,
        mockUserId
      );

      expect(result.status_code).toBe(201);
      expect(RateConfigurationHierarchies.create).not.toHaveBeenCalled();
      expect(RateConfigurationJobTemplates.create).not.toHaveBeenCalled();
      expect(RateConfigurationExpenses.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRateConfigurations', () => {
    const mockProgramId = 'program-123';
    const mockId = 'config-456';
    const mockUserId = 'user-789';
    const mockPayload = {
      name: 'Updated Rate Configuration',
      is_shift_rate: true,
      is_enabled: true,
      job_type: 'permanent',
      hierarchies: ['hierarchy-1'],
      job_templates: ['job-template-1'],
      expenses: [
        {
          expense_type_id: 'expense-1',
          unit_of_measure: 'day',
          unit_lable: 'Day',
          rate: 15.75,
          max_limit: 500,
        },
      ],
    };

    it('should successfully update an existing rate configuration', async () => {
      const mockExistingConfig = {
        id: mockId,
        name: 'Old Name',
        update: jest.fn(),
      };

      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationHierarchies.destroy as jest.Mock).mockResolvedValue(1);
      (RateConfigurationJobTemplates.destroy as jest.Mock).mockResolvedValue(1);
      (RateConfigurationExpenses.destroy as jest.Mock).mockResolvedValue(1);
      (RateConfigurationHierarchies.create as jest.Mock).mockResolvedValue({});
      (RateConfigurationJobTemplates.create as jest.Mock).mockResolvedValue({});
      (RateConfigurationExpenses.create as jest.Mock).mockResolvedValue({});

      const result = await RateConfigurationService.updateRateConfigurations(
        mockProgramId,
        mockId,
        mockPayload,
        mockUserId
      );

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations updated successfully.');
      expect(mockExistingConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockPayload.name,
          is_shift_rate: mockPayload.is_shift_rate,
          is_enabled: mockPayload.is_enabled,
          updated_by: mockUserId,
          job_type: mockPayload.job_type,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw error when rate configuration not found', async () => {
      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await RateConfigurationService.updateRateConfigurations(
        mockProgramId,
        'non-existent-id',
        mockPayload,
        mockUserId
      );

      expect(result).toEqual({
        status_code: 404,
        message: 'Rate configurations not found.',
        trace_id: 'mock-trace-id',
      });
    });

    it('should throw error when duplicate configuration exists', async () => {
      const mockExistingConfig = { id: mockId, update: jest.fn() };
      const duplicateConfig = [{ id: 'duplicate-config' }];

      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
      (sequelize.query as jest.Mock).mockResolvedValue(duplicateConfig);

      const result = await RateConfigurationService.updateRateConfigurations(
        mockProgramId,
        mockId,
        mockPayload,
        mockUserId
      );

      expect(result).toEqual({
        status_code: 409,
        message: 'Rate configurations with the same hierarchy and job template already exist.',
        trace_id: 'mock-trace-id',
      });
    });

    it('should handle complex rate configuration updates', async () => {
      const mockExistingConfig = { id: mockId, update: jest.fn() };
      const complexPayload = {
        ...mockPayload,
        rate_configuration: [
          {
            base_rate: {
              id: 'existing-base-rate',
              rate_type_id: 'rate-type-1',
              seq_number: 1,
            },
            rate: [
              {
                id: 'existing-rate',
                rate_type_id: 'rate-type-2',
                seq_number: 1,
                bill_rate: [
                  {
                    id: 'existing-bill-rate',
                    differential_on: 'base',
                    differential_type: 'Fixed Differential',
                    differential_value: 10.0,
                  },
                ],
                pay_rate: [
                  {
                    id: 'existing-pay-rate',
                    differential_on: 'base',
                    differential_type: 'Factor Differential',
                    differential_value: 1.5,
                  },
                ],
              },
            ],
          },
        ],
      };

      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationBaseRateTypes.destroy as jest.Mock).mockResolvedValue(1);
      (RateConfigurationBaseRateTypes.upsert as jest.Mock).mockResolvedValue([{ id: 'base-rate-upserted' }]);
      (RateConfigurationRateTypes.destroy as jest.Mock).mockResolvedValue(1);
      (RateConfigurationRateTypes.upsert as jest.Mock).mockResolvedValue([{ id: 'rate-type-upserted' }]);
      (RateConfigurationRateDifferentials.destroy as jest.Mock).mockResolvedValue(1);
      (RateConfigurationRateDifferentials.upsert as jest.Mock).mockResolvedValue([{}]);

      const result = await RateConfigurationService.updateRateConfigurations(
        mockProgramId,
        mockId,
        complexPayload,
        mockUserId
      );

      expect(result.status_code).toBe(200);
      expect(RateConfigurationBaseRateTypes.upsert).toHaveBeenCalled();
      expect(RateConfigurationRateTypes.upsert).toHaveBeenCalled();
      expect(RateConfigurationRateDifferentials.upsert).toHaveBeenCalled();
    });

    it('should handle errors and rollback transaction', async () => {
      const mockExistingConfig = { 
        id: mockId, 
        update: jest.fn().mockRejectedValue(new Error('Update failed'))
      };

      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      const result = await RateConfigurationService.updateRateConfigurations(
        mockProgramId,
        mockId,
        mockPayload,
        mockUserId
      );

      expect(result).toEqual({
        status_code: 500,
        message: 'An error occurred while updating the rate configurations.',
        error: 'Update failed',
        trace_id: 'mock-trace-id',
      });
    });
  });

  describe('deleteRateConfigurations', () => {
    const mockProgramId = 'program-123';
    const mockId = 'config-456';

    it('should successfully soft delete a rate configuration', async () => {
      const mockData = {
        id: mockId,
        update: jest.fn(),
      };

      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockData);

      const result = await RateConfigurationService.deleteRateConfigurations(mockProgramId, mockId);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations deleted successfully.');
      expect(result.rate_type_category_id).toBe(mockId);
      expect(mockData.update).toHaveBeenCalledWith({ is_enabled: false, is_deleted: true });
    });

    it('should return success when rate configuration not found', async () => {
      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await RateConfigurationService.deleteRateConfigurations(mockProgramId, 'non-existent');

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations data not found.');
      expect(result.rate_configurations).toEqual([]);
    });

    it('should handle database errors', async () => {
      (RateConfigurationsModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        RateConfigurationService.deleteRateConfigurations(mockProgramId, mockId)
      ).rejects.toEqual({
        status: 500,
        message: 'Error deleting rate configurations',
        error: 'Database error',
        trace_id: 'mock-trace-id',
      });
    });
  });

  describe('getAllRateConfigurations', () => {
    const mockProgramId = 'program-123';
    
    it('should successfully retrieve rate configurations with pagination', async () => {
      const mockQuery = {
        page: '2',
        limit: '5',
        name: 'Test Config',
        is_enabled: 'true',
      };

      const mockRateConfigurations = [
        {
          id: 'config-1',
          name: 'Test Config 1',
          base_rates: [
            {
              id: 'base-rate-1',
              name: 'Base Rate 1',
              rate_types: [
                { id: 'rate-type-1', name: 'Rate Type 1' },
              ],
            },
          ],
        },
      ];

      const mockCountResult = [{ total_count: 15 }];

      const { getAllRateConfigurationsQuery } = require('../../src/utility/queries');
      (getAllRateConfigurationsQuery as jest.Mock).mockResolvedValue(mockRateConfigurations);
      (sequelize.query as jest.Mock).mockResolvedValue(mockCountResult);

      const result = await RateConfigurationService.getAllRateConfigurations(mockProgramId, mockQuery);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations fetched successfully.');
      expect(result.items_per_page).toBe(5);
      expect(result.total_records).toBe(15);
      expect(result.rate_configurations).toHaveLength(1);
    });

    it('should return empty result when no configurations found', async () => {
      const { getAllRateConfigurationsQuery } = require('../../src/utility/queries');
      (getAllRateConfigurationsQuery as jest.Mock).mockResolvedValue([]);

      const result = await RateConfigurationService.getAllRateConfigurations(mockProgramId, {});

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations not found.');
      expect(result.rate_configurations).toEqual([]);
    });

    it('should handle database errors', async () => {
      const { getAllRateConfigurationsQuery } = require('../../src/utility/queries');
      (getAllRateConfigurationsQuery as jest.Mock).mockRejectedValue(new Error('Query failed'));

      await expect(
        RateConfigurationService.getAllRateConfigurations(mockProgramId, {})
      ).rejects.toEqual({
        status_code: 500,
        message: 'Internal Server Error',
        error: 'Query failed',
        trace_id: 'mock-trace-id',
      });
    });

    it('should parse boolean and date filters correctly', async () => {
      const mockQuery = {
        is_enabled: 'false',
        is_shift_rate: 'true',
        updated_on: '1640995200000,1643673600000',
      };

      const { getAllRateConfigurationsQuery } = require('../../src/utility/queries');
      (getAllRateConfigurationsQuery as jest.Mock).mockResolvedValue([]);
      (sequelize.query as jest.Mock).mockResolvedValue([{ total_count: 0 }]);

      await RateConfigurationService.getAllRateConfigurations(mockProgramId, mockQuery);

      const callArgs = (getAllRateConfigurationsQuery as jest.Mock).mock.calls[0][0];
      expect(callArgs.is_enabled).toBe(0);
      expect(callArgs.is_shift_rate).toBe(1);
      expect(callArgs.startDate).toBeDefined();
      expect(callArgs.endDate).toBeDefined();
    });
  });

  describe('getRateConfigurationById', () => {
    const mockProgramId = 'program-123';
    const mockId = 'config-456';

    it('should successfully retrieve a rate configuration by ID', async () => {
      const mockRateConfiguration = {
        id: mockId,
        program_id: mockProgramId,
        name: 'Test Configuration',
        is_shift_rate: 1,
        is_enabled: 1,
        job_type: 'contract',
      };

      const mockHierarchies = [
        { hierarchy: { id: 'h-1', name: 'Hierarchy 1' } },
      ];

      const mockJobTemplates = [
        { job_template: { id: 'jt-1', template_name: 'Job Template 1' } },
      ];

      const mockExpenseTypes = [
        {
          id: 'expense-1',
          unit_of_measure: 'hour',
          rate: 10.5,
          expense_type: { id: 'et-1', name: 'Travel' },
        },
      ];

      const mockBaseRates = [
        {
          id: 'base-rate-1',
          seq_number: 1,
          get: jest.fn((field: string) => {
            if (field === 'seq_number') return 1;
            return 1;
          }),
          rate_type: {
            id: 'rt-1',
            name: 'Base Rate',
            rate_type_category: 'category-1',
            get: jest.fn(() => ({ id: 'rt-1', name: 'Base Rate' })),
          },
        },
      ];

      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockRateConfiguration);
      (RateConfigurationHierarchies.findAll as jest.Mock).mockImplementation(() => 
        Promise.resolve(mockHierarchies.map(h => ({ hierarchy: h.hierarchy })))
      );
      (RateConfigurationJobTemplates.findAll as jest.Mock).mockImplementation(() => 
        Promise.resolve(mockJobTemplates.map(jt => ({ job_template: jt.job_template })))
      );
      (RateConfigurationExpenses.findAll as jest.Mock).mockResolvedValue(mockExpenseTypes);
      (RateConfigurationBaseRateTypes.findAll as jest.Mock).mockResolvedValue(mockBaseRates);
      (picklistItemModel.findOne as jest.Mock).mockResolvedValue({
        id: 'category-1',
        value: 'base',
        label: 'Base Rate Category',
      });
      (RateConfigurationRateTypes.findAll as jest.Mock).mockResolvedValue([]);

      const result = await RateConfigurationService.getRateConfigurationById(mockProgramId, mockId);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configuration fetched successfully.');
      expect(result.rate_configurations).toBeDefined();
      expect((result.rate_configurations as any).name).toBe('Test Configuration');
      expect((result.rate_configurations as any).hierarchie).toHaveLength(1);
      expect((result.rate_configurations as any).job_templates).toHaveLength(1);
      expect((result.rate_configurations as any).expenses).toHaveLength(1);
    });

    it('should return empty result when rate configuration not found', async () => {
      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await RateConfigurationService.getRateConfigurationById(mockProgramId, 'non-existent');

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configuration not found.');
      expect(result.rate_configurations).toBeNull();
    });

    it('should handle complex nested rate configuration data', async () => {
      const mockRateConfiguration = {
        id: mockId,
        program_id: mockProgramId,
        name: 'Complex Configuration',
        is_shift_rate: 1,
        is_enabled: 1,
      };

      const mockBaseRates = [
        {
          id: 'base-rate-1',
          seq_number: 1,
          get: jest.fn((field: string) => {
            if (field === 'seq_number') return 1;
            return 1;
          }),
          rate_type: {
            id: 'rt-1',
            name: 'Base Rate',
            rate_type_category: 'category-1',
            get: jest.fn(() => ({ id: 'rt-1', name: 'Base Rate' })),
          },
        },
      ];

      const mockRateTypes = [
        {
          id: 'rate-1',
          seq_number: 1,
          rate_type: {
            id: 'rt-2',
            name: 'Rate Type 1',
            rate_type_category: 'category-2',
            get: jest.fn(() => ({ id: 'rt-2', name: 'Rate Type 1' })),
          },
        },
      ];

      const mockBillRates = [
        {
          differential_on: 'base',
          differential_type: 'Fixed Differential',
          differential_value: 5.0,
        },
      ];

      const mockPayRates = [
        {
          differential_on: 'base',
          differential_type: 'Factor Differential',
          differential_value: 1.2,
        },
      ];

      (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockRateConfiguration);
      (RateConfigurationHierarchies.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
      (RateConfigurationJobTemplates.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
      (RateConfigurationExpenses.findAll as jest.Mock).mockResolvedValue([]);
      (RateConfigurationBaseRateTypes.findAll as jest.Mock).mockResolvedValue(mockBaseRates);
      (RateConfigurationRateTypes.findAll as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve(mockRateTypes))
        .mockImplementation(() => Promise.resolve([]));
      (RateConfigurationRateDifferentials.findAll as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve(mockBillRates))
        .mockImplementationOnce(() => Promise.resolve(mockPayRates));
      (picklistItemModel.findOne as jest.Mock).mockResolvedValue({
        id: 'category-1',
        value: 'base',
        label: 'Base Rate Category',
      });

      const result = await RateConfigurationService.getRateConfigurationById(mockProgramId, mockId);

      expect(result.status_code).toBe(200);
      expect(result.rate_configurations).toBeDefined();
      expect((result.rate_configurations as any).rate_configuration).toHaveLength(1);
      expect((result.rate_configurations as any).rate_configuration[0].rate).toHaveLength(1);
      expect((result.rate_configurations as any).rate_configuration[0].rate[0].bill_rate).toEqual(mockBillRates);
      expect((result.rate_configurations as any).rate_configuration[0].rate[0].pay_rate).toEqual(mockPayRates);
    });

    it('should handle database errors', async () => {
      (RateConfigurationsModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        RateConfigurationService.getRateConfigurationById(mockProgramId, mockId)
      ).rejects.toEqual({
        status_code: 500,
        trace_id: 'mock-trace-id',
        message: 'An error occurred while fetching rate configurations.',
        error: 'Database error',
      });
    });
  });

  describe('getAllHierarchiesAndJobTemplates', () => {
    const mockProgramId = 'program-123';

    it('should successfully retrieve hierarchies and job templates', async () => {
      const mockResults = [
        {
          hierarchy_id: 'h-1',
          hierarchy_name: 'Hierarchy 1',
          job_template_id: 'jt-1',
          job_template_name: 'Job Template 1',
          rate_id: 'rt-1',
          rate_name: 'Rate Type 1',
        },
        {
          hierarchy_id: 'h-2',
          hierarchy_name: 'Hierarchy 2',
          job_template_id: 'jt-2',
          job_template_name: 'Job Template 2',
          rate_id: 'rt-2',
          rate_name: 'Rate Type 2',
        },
        {
          hierarchy_id: 'h-1',
          hierarchy_name: 'Hierarchy 1', // Duplicate should be filtered
          job_template_id: 'jt-1',
          job_template_name: 'Job Template 1', // Duplicate should be filtered
          rate_id: 'rt-1',
          rate_name: 'Rate Type 1', // Duplicate should be filtered
        },
      ];

      (sequelize.query as jest.Mock).mockResolvedValue(mockResults);

      const result = await RateConfigurationService.getAllHierarchiesAndJobTemplates(mockProgramId);

      expect(result.status_code).toBe(200);
      expect(result.data.hierarchies).toHaveLength(2);
      expect(result.data.job_templates).toHaveLength(2);
      expect(result.data.rate_type).toHaveLength(2);
      expect(result.data.hierarchies[0]).toEqual({ id: 'h-1', name: 'Hierarchy 1' });
      expect(result.data.job_templates[0]).toEqual({ id: 'jt-1', name: 'Job Template 1' });
      expect(result.data.rate_type[0]).toEqual({ id: 'rt-1', name: 'Rate Type 1' });
    });

    it('should handle database errors', async () => {
      (sequelize.query as jest.Mock).mockRejectedValue(new Error('Query failed'));

      await expect(
        RateConfigurationService.getAllHierarchiesAndJobTemplates(mockProgramId)
      ).rejects.toEqual({
        status_code: 500,
        trace_id: 'mock-trace-id',
        message: 'Failed to retrieve hierarchies and job template data',
        error: 'Query failed',
      });
    });

    it('should handle empty results', async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      const result = await RateConfigurationService.getAllHierarchiesAndJobTemplates(mockProgramId);

      expect(result.status_code).toBe(200);
      expect(result.data.hierarchies).toHaveLength(0);
      expect(result.data.job_templates).toHaveLength(0);
      expect(result.data.rate_type).toHaveLength(0);
    });
  });

  describe('getAllRateConfigurationBudget', () => {
    const mockProgramId = 'program-123';
    const mockConfigs = [
      {
        program_id: mockProgramId,
        name: 'Budget Config 1',
        is_shift_rate: true,
        hierarchies: [{ id: 'h-1', name: 'Hierarchy 1' }],
        job_templates: [{ id: 'jt-1', name: 'Job Template 1' }],
        ot_exempt: false,
        rate_configuration: [
          {
            base_rate: {
              rate_type: {
                min_rate: { amount: 10.0 },
                max_rate: { amount: 20.0 },
              },
              rates: [
                {
                  rate_type: {
                    rate_type_category: { value: 'base' },
                  },
                  bill_rate: [
                    {
                      differential_on: 'base',
                      differential_type: 'Fixed Differential',
                      differential_value: 5.0,
                    },
                  ],
                  pay_rate: [
                    {
                      differential_on: 'base',
                      differential_type: 'Factor Differential',
                      differential_value: 1.2,
                    },
                  ],
                },
              ],
            },
            rate: [
              {
                rate_type: {
                  rate_type_category: { value: 'overtime' },
                },
                bill_rate: [
                  {
                    differential_on: 'base',
                    differential_type: 'Factor Differential',
                    differential_value: 1.5,
                  },
                ],
                pay_rate: [
                  {
                    differential_on: 'base',
                    differential_type: 'Factor Differential',
                    differential_value: 1.3,
                  },
                ],
                rates: [
                  {
                    rate_type: {
                      rate_type_category: { value: 'shift' },
                    },
                    bill_rate: [
                      {
                        differential_on: 'shift',
                        differential_type: 'Fixed Differential',
                        differential_value: 2.0,
                      },
                    ],
                    pay_rate: [
                      {
                        differential_on: 'shift',
                        differential_type: 'Fixed Differential',
                        differential_value: 1.5,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    it('should successfully process rate configuration budget data', async () => {
      const result = await RateConfigurationService.getAllRateConfigurationBudget(mockProgramId, mockConfigs);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations fetched successfully.');
      expect(result.rate_configurations).toHaveLength(1);
      expect(result.rate_configurations[0].program_id).toBe(mockProgramId);
      expect(result.rate_configurations[0].name).toBe('Budget Config 1');
    });

    it('should handle database errors', async () => {
      const invalidConfigs = [{ invalid: 'data' }];

      await expect(
        RateConfigurationService.getAllRateConfigurationBudget(mockProgramId, invalidConfigs as any)
      ).rejects.toEqual({
        status_code: 500,
        trace_id: 'mock-trace-id',
        message: 'Internal Server Error',
        error: expect.any(String),
      });
    });
  });

  describe('rateConfigurationsFilter', () => {
    const mockProgramId = 'program-123';
    const mockFilters = {
      id: 'config-1',
      name: 'Test Config',
      is_shift_rate: 'true',
      job_type: 'contract',
      is_enabled: 'true',
      updated_on: ['2023-01-01', '2023-12-31'],
      page: '1',
      limit: '10',
    };

    it('should successfully filter rate configurations', async () => {
      const mockData = [
        {
          id: 'config-1',
          name: 'Test Config',
          is_shift_rate: 1,
          job_type: 'contract',
          is_enabled: 1,
        },
      ];

      const { rateConfigurationsFilterQuery } = require('../../src/utility/queries');
      (rateConfigurationsFilterQuery as jest.Mock).mockReturnValue('SELECT * FROM mock_query');
      (sequelize.query as jest.Mock).mockResolvedValue(mockData);

      const result = await RateConfigurationService.rateConfigurationsFilter(mockProgramId, mockFilters);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations fetched successfully.');
      expect(result.rate_configurations).toEqual(mockData);
    });

    it('should return empty result when no configurations found', async () => {
      const { rateConfigurationsFilterQuery } = require('../../src/utility/queries');
      (rateConfigurationsFilterQuery as jest.Mock).mockReturnValue('SELECT * FROM mock_query');
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      const result = await RateConfigurationService.rateConfigurationsFilter(mockProgramId, mockFilters);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations not found.');
      expect(result.rate_configurations).toEqual([]);
    });

    it('should handle database errors', async () => {
      const { rateConfigurationsFilterQuery } = require('../../src/utility/queries');
      (rateConfigurationsFilterQuery as jest.Mock).mockReturnValue('SELECT * FROM mock_query');
      (sequelize.query as jest.Mock).mockRejectedValue(new Error('Query failed'));

      await expect(
        RateConfigurationService.rateConfigurationsFilter(mockProgramId, mockFilters)
      ).rejects.toEqual({
        status_code: 500,
        message: 'Internal Server Error',
        trace_id: 'mock-trace-id',
        error: 'Query failed',
      });
    });
  });

  describe('getAllRateConfigurationRates', () => {
    const mockProgramId = 'program-123';
    const mockQuery = {
      hierarchie_id: 'h-1,h-2',
      job_templates: 'jt-1,jt-2',
      is_shift_rate: 'true',
      currency_id: 'USD',
      unit_of_measure: 'hour',
      labor_category_id: 'lc-1',
      ot_exempt: 'false',
      job_type: 'contract',
    };

    it('should successfully retrieve rate configuration rates with matching configurations', async () => {
      const mockRateCardDecisionRecords = [
        {
          id: 'rcdr-1',
          rate_card_id: 'rc-1',
          rate_type_id: 'rt-1',
          hierarchy_id: 'h-1',
          min_rate: { amount: 10.0, is_changeable: true, is_reduceable: false },
          max_rate: { amount: 20.0, is_changeable: true, is_reduceable: false },
          job_template_id: 'jt-1',
          unit_of_measure: 'hour',
          currency: 'USD',
        },
      ];

      const mockMatchingRateConfigurations = [
        {
          id: 'rc-1',
          name: 'Test Rate Config',
          is_shift_rate: 1,
        },
      ];

      const mockHierarchyRelations = [
        {
          rate_configuration_id: 'rc-1',
          hierarchy_id: 'h-1',
          hierarchy: { id: 'h-1', name: 'Hierarchy 1' },
        },
      ];

      const mockExpenses = [
        {
          id: 'exp-1',
          rate_configuration_id: 'rc-1',
          unit_of_measure: 'hour',
          rate: 5.0,
          expense_type: { id: 'et-1', name: 'Travel' },
        },
      ];

      const mockBaseRates = [
        {
          id: 'br-1',
          seq_number: 1,
          rate_configuration_id: 'rc-1',
          rate_type: {
            id: 'rt-1',
            name: 'Base Rate',
            rate_type_category: 'category-1',
            is_base_rate: true,
            shift_type: 'shift-1',
            get: jest.fn(() => ({ 
              id: 'rt-1', 
              name: 'Base Rate',
              rate_type_category: 'category-1',
              is_base_rate: true,
              shift_type: 'shift-1' 
            })),
          },
        },
      ];

      const mockRateTypeCategories = [
        {
          id: 'category-1',
          value: 'base',
          label: 'Base Rate Category',
        },
      ];

      const mockShiftTypes = [
        {
          id: 'shift-1',
          shift_type_name: 'Day Shift',
          shift_format: '8-hour',
          shift_type_configuration: {
            time_duration: 8,
            shift_type_time: '09:00-17:00',
          },
        },
      ];

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce(mockRateCardDecisionRecords) // rateCardMinRateMaxRate query
        .mockResolvedValue([]);  // other queries
      (RateConfigurationsRepository.getRateConfigurationsByProgramId as jest.Mock)
        .mockResolvedValue(mockMatchingRateConfigurations);
      (RateConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue(mockHierarchyRelations);
      (RateConfigurationExpenses.findAll as jest.Mock).mockResolvedValue(mockExpenses);
      (RateConfigurationBaseRateTypes.findAll as jest.Mock).mockResolvedValue(mockBaseRates);
      (RateConfigurationRateTypes.findAll as jest.Mock).mockResolvedValue([]);
      (picklistItemModel.findAll as jest.Mock).mockResolvedValue(mockRateTypeCategories);
      (ShiftType.findAll as jest.Mock).mockResolvedValue(mockShiftTypes);
      (RateConfigurationRateDifferentials.findAll as jest.Mock).mockResolvedValue([]);

      const result = await RateConfigurationService.getAllRateConfigurationRates(mockProgramId, mockQuery);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations fetched successfully.');
      expect(result.rate_configurations).toBeDefined();
    });

    it('should handle standard base rate case when no matching configurations', async () => {
      const mockStandardBaseRate = [
        {
          id: 'sbr-1',
          name: 'Standard Base Rate',
          rate_type_category: 'category-1',
          is_base_rate: true,
          shift_type: 'shift-1',
          get: jest.fn(() => ({ id: 'sbr-1', name: 'Standard Base Rate' })),
        },
      ];

      const mockHierarchyDetails = [
        { id: 'h-1', name: 'Hierarchy 1' },
        { id: 'h-2', name: 'Hierarchy 2' },
      ];

      (sequelize.query as jest.Mock).mockResolvedValue([]); // Empty rate card decision records
      (RateConfigurationsRepository.getRateConfigurationsByProgramId as jest.Mock)
        .mockResolvedValue([]); // No matching configurations
      (rateType.findAll as jest.Mock).mockResolvedValue(mockStandardBaseRate);
      (hierarchies.findAll as jest.Mock).mockResolvedValue(mockHierarchyDetails);
      (picklistItemModel.findAll as jest.Mock).mockResolvedValue([]);
      (ShiftType.findAll as jest.Mock).mockResolvedValue([]);

      const result = await RateConfigurationService.getAllRateConfigurationRates(mockProgramId, mockQuery);

      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate configurations fetched successfully.');
      expect(result.rate_configurations).toHaveLength(1);
      expect(result.rate_configurations[0].name).toBeNull();
      expect(result.rate_configurations[0].hierarchies).toEqual(mockHierarchyDetails);
    });

    it('should throw error when no standard base rate available', async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationsRepository.getRateConfigurationsByProgramId as jest.Mock)
        .mockResolvedValue([]);
      (rateType.findAll as jest.Mock).mockResolvedValue([]); // No standard base rates
      (hierarchies.findAll as jest.Mock).mockResolvedValue([{ id: 'h-1', name: 'Hierarchy 1' }]);

      await expect(
        RateConfigurationService.getAllRateConfigurationRates(mockProgramId, mockQuery)
      ).rejects.toEqual({
        status_code: 400,
        trace_id: 'mock-trace-id',
        message: 'No rate configurations found and no standard base rate available.',
      });
    });

    it('should throw error when hierarchies not found', async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);
      (RateConfigurationsRepository.getRateConfigurationsByProgramId as jest.Mock)
        .mockResolvedValue([]);
      (rateType.findAll as jest.Mock).mockResolvedValue([{ id: 'rt-1', name: 'Base Rate' }]);
      (hierarchies.findAll as jest.Mock).mockResolvedValue([]); // No hierarchies found

      await expect(
        RateConfigurationService.getAllRateConfigurationRates(mockProgramId, mockQuery)
      ).rejects.toEqual({
        status_code: 500,
        trace_id: 'mock-trace-id',
        message: 'Hierarchies not found.',
      });
    });

    it('should throw error when bill rates and pay rates are missing', async () => {
      const mockRateCardDecisionRecords = [
        {
          id: 'rcdr-1',
          min_rate: { amount: 10.0, is_changeable: true, is_reduceable: false },
          max_rate: { amount: 20.0, is_changeable: true, is_reduceable: false },
        },
      ];

      const mockMatchingRateConfigurations = [{ id: 'rc-1', name: 'Test Config' }];
      const mockBaseRates = [
        {
          id: 'br-1',
          rate_configuration_id: 'rc-1',
          rate_type: { id: 'rt-1', name: 'Base Rate', is_base_rate: true },
        },
      ];
      const mockRateTypes = [
        {
          id: 'rate-1',
          base_rate_type_id: 'br-1',
          rate_type: { id: 'rt-2', name: 'Rate Type', is_base_rate: false },
        },
      ];

      (sequelize.query as jest.Mock).mockResolvedValue(mockRateCardDecisionRecords);
      (RateConfigurationsRepository.getRateConfigurationsByProgramId as jest.Mock)
        .mockResolvedValue(mockMatchingRateConfigurations);
      (RateConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (RateConfigurationExpenses.findAll as jest.Mock).mockResolvedValue([]);
      (RateConfigurationBaseRateTypes.findAll as jest.Mock).mockResolvedValue(mockBaseRates);
      (RateConfigurationRateTypes.findAll as jest.Mock).mockResolvedValue(mockRateTypes);
      (picklistItemModel.findAll as jest.Mock).mockResolvedValue([]);
      (ShiftType.findAll as jest.Mock).mockResolvedValue([]);
      (RateConfigurationRateDifferentials.findAll as jest.Mock)
        .mockResolvedValueOnce([]) // No bill rates
        .mockResolvedValueOnce([]); // No pay rates

      await expect(
        RateConfigurationService.getAllRateConfigurationRates(mockProgramId, mockQuery)
      ).rejects.toEqual({
        status_code: 400,
        message: expect.stringContaining('Bill rates and pay rates differentials not found'),
        trace_id: 'mock-trace-id',
      });
    });

    it('should handle database errors', async () => {
      (sequelize.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        RateConfigurationService.getAllRateConfigurationRates(mockProgramId, mockQuery)
      ).rejects.toEqual({
        status_code: 500,
        trace_id: 'mock-trace-id',
        message: 'Database error',
      });
    });
  });

  describe('Edge Cases and Additional Scenarios', () => {
    describe('createRateConfigurations edge cases', () => {
      const mockProgramId = 'program-123';
      const mockUserId = 'user-456';

      it('should handle empty rate_configuration array', async () => {
        const payloadWithEmptyRateConfig = {
          name: 'Empty Rate Config',
          is_shift_rate: false,
          rate_configuration: [],
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'empty-config-123' });

        const result = await RateConfigurationService.createRateConfigurations(
          mockProgramId,
          payloadWithEmptyRateConfig,
          mockUserId
        );

        expect(result.status_code).toBe(201);
        expect(result.message).toBe('Rate configurations created successfully.');
      });

      it('should handle payload with null/undefined rate_configuration', async () => {
        const payloadWithNullRateConfig = {
          name: 'Null Rate Config',
          is_shift_rate: false,
          rate_configuration: null,
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'null-config-123' });

        const result = await RateConfigurationService.createRateConfigurations(
          mockProgramId,
          payloadWithNullRateConfig,
          mockUserId
        );

        expect(result.status_code).toBe(201);
        expect(RateConfigurationBaseRateTypes.create).not.toHaveBeenCalled();
      });

      it('should handle missing base_rate in rate_configuration', async () => {
        const payloadWithMissingBaseRate = {
          name: 'Missing Base Rate Config',
          is_shift_rate: false,
          rate_configuration: [
            {
              // Missing base_rate
              rate: [
                {
                  rate_type_id: 'rate-type-1',
                  seq_number: 1,
                  bill_rate: [],
                  pay_rate: [],
                },
              ],
            },
          ],
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'missing-base-123' });

        const result = await RateConfigurationService.createRateConfigurations(
          mockProgramId,
          payloadWithMissingBaseRate,
          mockUserId
        );

        expect(result.status_code).toBe(201);
        expect(RateConfigurationBaseRateTypes.create).not.toHaveBeenCalled();
      });

      it('should handle null base_rate.rate_type_id', async () => {
        const payloadWithNullRateTypeId = {
          name: 'Null Rate Type ID Config',
          is_shift_rate: false,
          rate_configuration: [
            {
              base_rate: {
                rate_type_id: null, // null rate_type_id
                seq_number: 1,
              },
            },
          ],
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'null-rate-type-123' });

        const result = await RateConfigurationService.createRateConfigurations(
          mockProgramId,
          payloadWithNullRateTypeId,
          mockUserId
        );

        expect(result.status_code).toBe(201);
        expect(RateConfigurationBaseRateTypes.create).not.toHaveBeenCalled();
      });

      it('should skip rate creation when rate.rate_type_id is null', async () => {
        const payloadWithNullRateId = {
          name: 'Null Rate ID Config',
          is_shift_rate: false,
          rate_configuration: [
            {
              base_rate: {
                rate_type_id: 'base-rate-type-1',
                seq_number: 1,
              },
              rate: [
                {
                  rate_type_id: null, // null rate_type_id
                  seq_number: 1,
                  bill_rate: [],
                  pay_rate: [],
                },
                {
                  rate_type_id: 'valid-rate-type-1',
                  seq_number: 2,
                  bill_rate: [],
                  pay_rate: [],
                },
              ],
            },
          ],
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'null-rate-id-123' });
        (RateConfigurationBaseRateTypes.create as jest.Mock).mockResolvedValue({ id: 'base-rate-123' });
        (RateConfigurationRateTypes.create as jest.Mock).mockResolvedValue({ id: 'rate-type-123' });

        const result = await RateConfigurationService.createRateConfigurations(
          mockProgramId,
          payloadWithNullRateId,
          mockUserId
        );

        expect(result.status_code).toBe(201);
        expect(RateConfigurationRateTypes.create).toHaveBeenCalledTimes(1); // Only valid rate created
      });

      it('should handle non-array bill_rate and pay_rate', async () => {
        const payloadWithNonArrayRates = {
          name: 'Non-Array Rates Config',
          is_shift_rate: false,
          rate_configuration: [
            {
              base_rate: {
                rate_type_id: 'base-rate-type-1',
                seq_number: 1,
              },
              rate: [
                {
                  rate_type_id: 'rate-type-1',
                  seq_number: 1,
                  bill_rate: 'not-an-array', // Invalid type
                  pay_rate: null, // null value
                },
              ],
            },
          ],
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'non-array-123' });
        (RateConfigurationBaseRateTypes.create as jest.Mock).mockResolvedValue({ id: 'base-rate-123' });
        (RateConfigurationRateTypes.create as jest.Mock).mockResolvedValue({ id: 'rate-type-123' });

        const result = await RateConfigurationService.createRateConfigurations(
          mockProgramId,
          payloadWithNonArrayRates,
          mockUserId
        );

        expect(result.status_code).toBe(201);
        expect(RateConfigurationRateDifferentials.create).not.toHaveBeenCalled();
      });
    });

    describe('updateRateConfigurations edge cases', () => {
      const mockProgramId = 'program-123';
      const mockId = 'config-456';
      const mockUserId = 'user-789';

      it('should handle missing rate configuration payload fields', async () => {
        const mockExistingConfig = {
          id: mockId,
          update: jest.fn(),
        };

        const minimalPayload = {
          name: 'Updated Name Only',
        };

        (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);

        const result = await RateConfigurationService.updateRateConfigurations(
          mockProgramId,
          mockId,
          minimalPayload,
          mockUserId
        );

        expect(result.status_code).toBe(200);
        expect(mockExistingConfig.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Name Only',
            job_type: undefined,
          }),
          { transaction: mockTransaction }
        );
      });

      it('should handle job_type as string instead of object', async () => {
        const mockExistingConfig = {
          id: mockId,
          update: jest.fn(),
        };

        const payloadWithStringJobType = {
          name: 'String Job Type Config',
          job_type: 'simple-string',
        };

        (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
        (sequelize.query as jest.Mock).mockResolvedValue([]);

        const result = await RateConfigurationService.updateRateConfigurations(
          mockProgramId,
          mockId,
          payloadWithStringJobType,
          mockUserId
        );

        expect(result.status_code).toBe(200);
        expect(mockExistingConfig.update).toHaveBeenCalledWith(
          expect.objectContaining({
            job_type: 'simple-string',
          }),
          { transaction: mockTransaction }
        );
      });

      it('should handle upsert failure in base rate types', async () => {
        const mockExistingConfig = {
          id: mockId,
          update: jest.fn(),
        };

        const payloadWithRateConfig = {
          name: 'Upsert Failure Test',
          rate_configuration: [
            {
              base_rate: {
                id: 'existing-base-rate',
                rate_type_id: 'rate-type-1',
                seq_number: 1,
              },
            },
          ],
        };

        (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationBaseRateTypes.destroy as jest.Mock).mockResolvedValue(1);
        (RateConfigurationBaseRateTypes.upsert as jest.Mock).mockRejectedValue(new Error('Upsert failed'));

        const result = await RateConfigurationService.updateRateConfigurations(
          mockProgramId,
          mockId,
          payloadWithRateConfig,
          mockUserId
        );

        expect(result).toEqual({
          status_code: 500,
          message: 'An error occurred while updating the rate configurations.',
          error: 'Upsert failed',
          trace_id: 'mock-trace-id',
        });
      });
    });

    describe('getAllRateConfigurations edge cases', () => {
      const mockProgramId = 'program-123';

      it('should handle invalid page and limit values', async () => {
        const invalidQuery = {
          page: 'invalid',
          limit: 'also-invalid',
        };

        const { getAllRateConfigurationsQuery } = require('../../src/utility/queries');
        (getAllRateConfigurationsQuery as jest.Mock).mockResolvedValue([]);
        (sequelize.query as jest.Mock).mockResolvedValue([{ total_count: 0 }]);

        const result = await RateConfigurationService.getAllRateConfigurations(mockProgramId, invalidQuery);

        expect(result.status_code).toBe(200);
        expect(result.items_per_page).toBe(undefined); // Default limit when invalid
        expect(result.total_records).toBe(undefined);
        expect(result.rate_configurations).toEqual([]);
      });

      it('should handle missing total_count in result', async () => {
        const { getAllRateConfigurationsQuery } = require('../../src/utility/queries');
        (getAllRateConfigurationsQuery as jest.Mock).mockResolvedValue([{
          id: 'config-1',
          name: 'Test Config',
        }]);
        (sequelize.query as jest.Mock).mockResolvedValue([]); // Empty result, no total_count

        const result = await RateConfigurationService.getAllRateConfigurations(mockProgramId, {});

        expect(result.status_code).toBe(200);
        expect(result.total_records).toBe(0); // Default when missing
      });

      it('should transform data with missing base_rates', async () => {
        const mockConfigWithoutBaseRates = {
          id: 'config-1',
          name: 'Config without base rates',
          // base_rates is undefined
        };

        const { getAllRateConfigurationsQuery } = require('../../src/utility/queries');
        (getAllRateConfigurationsQuery as jest.Mock).mockResolvedValue([mockConfigWithoutBaseRates]);
        (sequelize.query as jest.Mock).mockResolvedValue([{ total_count: 1 }]);

        const result = await RateConfigurationService.getAllRateConfigurations(mockProgramId, {});

        expect(result.status_code).toBe(200);
        expect(result.rate_configurations[0].base_rates).toEqual([]);
      });
    });

    describe('getRateConfigurationById edge cases', () => {
      const mockProgramId = 'program-123';
      const mockId = 'config-456';

      it('should handle non-array job_type', async () => {
        const mockRateConfiguration = {
          id: mockId,
          program_id: mockProgramId,
          name: 'Test Configuration',
          job_type: 'single-string', // Not an array
        };

        (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockRateConfiguration);
        (RateConfigurationHierarchies.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
        (RateConfigurationJobTemplates.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
        (RateConfigurationExpenses.findAll as jest.Mock).mockResolvedValue([]);
        (RateConfigurationBaseRateTypes.findAll as jest.Mock).mockResolvedValue([]);

        const result = await RateConfigurationService.getRateConfigurationById(mockProgramId, mockId);

        expect(result.status_code).toBe(200);
        expect((result.rate_configurations as any).job_type).toEqual([]);
      });

      it('should handle null job_type', async () => {
        const mockRateConfiguration = {
          id: mockId,
          program_id: mockProgramId,
          name: 'Test Configuration',
          job_type: null,
        };

        (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockRateConfiguration);
        (RateConfigurationHierarchies.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
        (RateConfigurationJobTemplates.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
        (RateConfigurationExpenses.findAll as jest.Mock).mockResolvedValue([]);
        (RateConfigurationBaseRateTypes.findAll as jest.Mock).mockResolvedValue([]);

        const result = await RateConfigurationService.getRateConfigurationById(mockProgramId, mockId);

        expect(result.status_code).toBe(200);
        expect((result.rate_configurations as any).job_type).toEqual([]);
      });

      it('should handle missing rate_type in base rates', async () => {
        const mockRateConfiguration = {
          id: mockId,
          program_id: mockProgramId,
          name: 'Test Configuration',
        };

        const mockBaseRateWithoutRateType = {
          id: 'base-rate-1',
          seq_number: 1,
          rate_type: null, // Missing rate_type
          get: jest.fn(() => 1),
        };

        (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockRateConfiguration);
        (RateConfigurationHierarchies.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
        (RateConfigurationJobTemplates.findAll as jest.Mock).mockImplementation(() => Promise.resolve([]));
        (RateConfigurationExpenses.findAll as jest.Mock).mockResolvedValue([]);
        (RateConfigurationBaseRateTypes.findAll as jest.Mock).mockResolvedValue([mockBaseRateWithoutRateType]);
        (RateConfigurationRateTypes.findAll as jest.Mock).mockResolvedValue([]);

        const result = await RateConfigurationService.getRateConfigurationById(mockProgramId, mockId);

        expect(result.status_code).toBe(200);
        expect((result.rate_configurations as any).rate_configuration[0].base_rate).toBeNull();
      });
    });

    describe('getAllRateConfigurationRates edge cases', () => {
      const mockProgramId = 'program-123';
      const mockQuery = {
        hierarchie_id: 'h-1',
        job_templates: 'jt-1',
        is_shift_rate: 'true',
        currency_id: 'USD',
        unit_of_measure: 'hour',
        labor_category_id: 'lc-1',
        ot_exempt: 'false',
        job_type: 'contract',
      };

      it('should handle empty hierarchie_id and job_templates', async () => {
        const emptyQuery = {
          ...mockQuery,
          hierarchie_id: '',
          job_templates: '',
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsRepository.getRateConfigurationsByProgramId as jest.Mock)
          .mockResolvedValue([]);
        (rateType.findAll as jest.Mock).mockResolvedValue([]);
        (hierarchies.findAll as jest.Mock).mockResolvedValue([]);

        await expect(
          RateConfigurationService.getAllRateConfigurationRates(mockProgramId, emptyQuery)
        ).rejects.toEqual({
          status_code: 400,
          trace_id: 'mock-trace-id',
          message: 'No rate configurations found and no standard base rate available.',
        });
      });

      it('should handle null job_type in query', async () => {
        const queryWithNullJobType = {
          ...mockQuery,
          job_type: '',
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsRepository.getRateConfigurationsByProgramId as jest.Mock)
          .mockResolvedValue([]);
        (rateType.findAll as jest.Mock).mockResolvedValue([{ 
          id: 'rt-1', 
          name: 'Base Rate',
          get: jest.fn(() => ({ id: 'rt-1', name: 'Base Rate' }))
        }]);
        (hierarchies.findAll as jest.Mock).mockResolvedValue([{ id: 'h-1', name: 'Hierarchy 1' }]);
        (picklistItemModel.findAll as jest.Mock).mockResolvedValue([]);
        (ShiftType.findAll as jest.Mock).mockResolvedValue([]);

        const result = await RateConfigurationService.getAllRateConfigurationRates(mockProgramId, queryWithNullJobType);

        expect(result.status_code).toBe(200);
        expect(result.rate_configurations).toHaveLength(1);
      });
    });

    describe('Error recovery scenarios', () => {
      it('should handle network timeouts in createRateConfigurations', async () => {
        const mockPayload = {
          name: 'Timeout Test',
          is_shift_rate: false,
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockRejectedValue(new Error('Network timeout'));

        await expect(
          RateConfigurationService.createRateConfigurations('program-123', mockPayload, 'user-123')
        ).rejects.toEqual({
          status: 500,
          message: 'Network timeout',
          error: 'Network timeout',
          trace_id: 'mock-trace-id',
        });

        expect(mockTransaction.rollback).toHaveBeenCalled();
      });

      it('should handle concurrent modification in updateRateConfigurations', async () => {
        const mockExistingConfig = {
          id: 'config-456',
          update: jest.fn().mockRejectedValue(new Error('Concurrent modification detected')),
        };

        (RateConfigurationsModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
        (sequelize.query as jest.Mock).mockResolvedValue([]);

        const result = await RateConfigurationService.updateRateConfigurations(
          'program-123',
          'config-456',
          { name: 'Updated' },
          'user-123'
        );

        expect(result).toEqual({
          status_code: 500,
          message: 'An error occurred while updating the rate configurations.',
          error: 'Concurrent modification detected',
          trace_id: 'mock-trace-id',
        });
      });
    });

    describe('Large dataset scenarios', () => {
      it('should handle configuration with many hierarchies and job templates', async () => {
        const largePayload = {
          name: 'Large Configuration',
          hierarchies: Array.from({ length: 100 }, (_, i) => `hierarchy-${i}`),
          job_templates: Array.from({ length: 50 }, (_, i) => `job-template-${i}`),
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'large-config-123' });
        (RateConfigurationHierarchies.create as jest.Mock).mockResolvedValue({});
        (RateConfigurationJobTemplates.create as jest.Mock).mockResolvedValue({});

        const result = await RateConfigurationService.createRateConfigurations(
          'program-123',
          largePayload,
          'user-123'
        );

        expect(result.status_code).toBe(201);
        expect(RateConfigurationHierarchies.create).toHaveBeenCalledTimes(100);
        expect(RateConfigurationJobTemplates.create).toHaveBeenCalledTimes(50);
      });

      it('should handle deeply nested rate configuration', async () => {
        const deepNestedPayload = {
          name: 'Deep Nested Configuration',
          rate_configuration: Array.from({ length: 10 }, (_, i) => ({
            base_rate: {
              rate_type_id: `base-rate-${i}`,
              seq_number: i + 1,
            },
            rate: Array.from({ length: 5 }, (_, j) => ({
              rate_type_id: `rate-type-${i}-${j}`,
              seq_number: j + 1,
              bill_rate: Array.from({ length: 3 }, (_, k) => ({
                differential_on: 'base',
                differential_type: 'Fixed Differential',
                differential_value: k + 1,
              })),
              pay_rate: Array.from({ length: 3 }, (_, k) => ({
                differential_on: 'base',
                differential_type: 'Factor Differential',
                differential_value: 1 + (k * 0.1),
              })),
            })),
          })),
        };

        (sequelize.query as jest.Mock).mockResolvedValue([]);
        (RateConfigurationsModel.create as jest.Mock).mockResolvedValue({ id: 'deep-nested-123' });
        (RateConfigurationBaseRateTypes.create as jest.Mock).mockResolvedValue({ id: 'base-rate-123' });
        (RateConfigurationRateTypes.create as jest.Mock).mockResolvedValue({ id: 'rate-type-123' });
        (RateConfigurationRateDifferentials.create as jest.Mock).mockResolvedValue({});

        const result = await RateConfigurationService.createRateConfigurations(
          'program-123',
          deepNestedPayload,
          'user-123'
        );

        expect(result.status_code).toBe(201);
        expect(RateConfigurationBaseRateTypes.create).toHaveBeenCalledTimes(10);
        expect(RateConfigurationRateTypes.create).toHaveBeenCalledTimes(50); // 10 * 5
        expect(RateConfigurationRateDifferentials.create).toHaveBeenCalledTimes(300); // 10 * 5 * (3 + 3)
      });
    });
  });

  describe('Helper Methods', () => {
    describe('parseBoolean', () => {
      it('should parse string "true" to 1', () => {
        const service = RateConfigurationService as any;
        expect(service.parseBoolean('true')).toBe(1);
      });

      it('should parse string "false" to 0', () => {
        const service = RateConfigurationService as any;
        expect(service.parseBoolean('false')).toBe(0);
      });

      it('should parse boolean true to 1', () => {
        const service = RateConfigurationService as any;
        expect(service.parseBoolean(true)).toBe(1);
      });

      it('should parse boolean false to 0', () => {
        const service = RateConfigurationService as any;
        expect(service.parseBoolean(false)).toBe(0);
      });

      it('should return undefined for other values', () => {
        const service = RateConfigurationService as any;
        expect(service.parseBoolean(null)).toBeUndefined();
        expect(service.parseBoolean(undefined)).toBeUndefined();
        expect(service.parseBoolean(123)).toBeUndefined();
      });
    });

    describe('parseDateRange', () => {
      it('should parse single timestamp', () => {
        const service = RateConfigurationService as any;
        const result = service.parseDateRange('1640995200000');
        expect(result.startDate).toBeDefined();
        expect(result.endDate).toBeDefined();
        expect(result.startDate).toBeLessThan(result.endDate);
      });

      it('should parse timestamp range', () => {
        const service = RateConfigurationService as any;
        const result = service.parseDateRange('1640995200000,1643673600000');
        expect(result.startDate).toBeDefined();
        expect(result.endDate).toBeDefined();
        expect(result.startDate).toBeLessThan(result.endDate);
      });

      it('should return empty object for invalid input', () => {
        const service = RateConfigurationService as any;
        expect(service.parseDateRange('')).toEqual({});
        expect(service.parseDateRange(undefined)).toEqual({});
        expect(service.parseDateRange('invalid')).toEqual({});
      });
    });

    describe('formatShiftType', () => {
      it('should format shift type with configuration', () => {
        const service = RateConfigurationService as any;
        const mockShiftType = {
          id: 'shift-1',
          shift_type_name: 'Day Shift',
          shift_format: '8-hour',
          shift_type_configuration: {
            time_duration: 8,
            shift_type_time: '09:00-17:00',
          },
        };

        const result = service.formatShiftType(mockShiftType);
        expect(result.id).toBe('shift-1');
        expect(result.shift_type_name).toBe('Day Shift');
        expect(result.time_duration).toBe(8);
        expect(result.shift_type_time).toBe('09:00-17:00');
      });

      it('should format shift type without configuration', () => {
        const service = RateConfigurationService as any;
        const mockShiftType = {
          id: 'shift-1',
          shift_type_name: 'Night Shift',
          shift_format: '12-hour',
        };

        const result = service.formatShiftType(mockShiftType);
        expect(result.id).toBe('shift-1');
        expect(result.shift_type_name).toBe('Night Shift');
        expect(result.time_duration).toBeUndefined();
        expect(result.shift_type_time).toBeUndefined();
      });

      it('should return null for null input', () => {
        const service = RateConfigurationService as any;
        expect(service.formatShiftType(null)).toBeNull();
      });
    });
  });
});
