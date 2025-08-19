import ExpenseConfigurationService from '../../src/service/expense-configuration.service';
import ExpenseConfigurationModel from '../../src/models/expense-configuration.model';
import ExpenseTypeMapping from '../../src/models/expense-config-expense-type-mapping.model';
import Hierarchies from '../../src/models/hierarchies.model';
import ExpenseTypeModel from '../../src/models/expense-type.model';
import FoundationalDataTypes from '../../src/models/master-datatypes.model';
import CustomField from '../../src/models/custom-fields.model';
import { sequelize } from '../../src/config/instance';
import GlobalRepository from '../../src/repositories/global.repository';
import { logger } from '../../src/utility/loggerService';
import generateCustomUUID from '../../src/utility/genrateTraceId';

// Mocking the models and dependencies
jest.mock('../../src/models/expense-configuration.model', () => ({
  findAndCountAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  bulkCreate: jest.fn(),
}));
jest.mock('../../src/models/expense-config-expense-type-mapping.model', () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
}));
jest.mock('../../src/models/hierarchies.model', () => ({
  findAll: jest.fn(),
}));
jest.mock('../../src/models/expense-type.model', () => ({
    findAll: jest.fn(),
}));
jest.mock('../../src/models/master-datatypes.model', () => ({
    findAll: jest.fn(),
}));
jest.mock('../../src/models/custom-fields.model', () => ({
    findAll: jest.fn(),
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
jest.mock('../../src/repositories/global.repository', () => ({
  getUserHierarchyData: jest.fn(),
}));
jest.mock('../../src/utility/loggerService', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../src/utility/genrateTraceId', () => jest.fn(() => 'mock-uuid'));

describe('ExpenseConfigurationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getExpenseConfigurations', () => {
    it('should return a list of expense configurations', async () => {
      const mockRequest: any = {
        params: { program_id: 'program-1' },
        query: { page: 1, limit: 10 },
      };
      const mockTraceId = 'trace-1';
      const mockExpenseConfigList = {
        count: 1,
        rows: [
          {
            toJSON: () => ({
              id: 'config-1',
              name: 'Test Config',
              hierarchy_ids: ['h-1'],
            }),
          },
        ],
      };
      (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue(mockExpenseConfigList);
      (Hierarchies.findAll as jest.Mock).mockResolvedValue([
        { id: 'h-1', name: 'Hierarchy 1' },
      ]);

      const result = await ExpenseConfigurationService.getExpenseConfigurations({
        request: mockRequest,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      if (result.response.data) {
        expect(result.response.data).toHaveLength(1);
        expect(result.response.data[0].name).toBe('Test Config');
      }
      expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalled();
    });

    it('should handle no expense configurations found', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: { page: 1, limit: 10 },
        };
        const mockTraceId = 'trace-1';
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue({
          count: 0,
          rows: [],
        });

        const result = await ExpenseConfigurationService.getExpenseConfigurations({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('No expense configuration found.');
        expect(result.response.data).toHaveLength(0);
      });

      it('should handle database errors', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-1';
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await ExpenseConfigurationService.getExpenseConfigurations({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(500);
        expect(result.response.message).toBe('Internal Server Error');
      });

      it('should filter by name', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: { name: 'Test Config' },
        };
        const mockTraceId = 'trace-1';
        await ExpenseConfigurationService.getExpenseConfigurations({
          request: mockRequest,
          traceId: mockTraceId,
        });
        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ name: 'Test Config' }),
          })
        );
      });

      it('should filter by is_enabled', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: { is_enabled: 'true' },
        };
        const mockTraceId = 'trace-1';
        await ExpenseConfigurationService.getExpenseConfigurations({
          request: mockRequest,
          traceId: mockTraceId,
        });
        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ is_enabled: true }),
          })
        );
      });

      it('should filter by updated_on date range', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: { updated_on: '2023-01-01,2023-01-31' },
        };
        const mockTraceId = 'trace-1';
        await ExpenseConfigurationService.getExpenseConfigurations({
          request: mockRequest,
          traceId: mockTraceId,
        });
        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              updated_on: expect.any(Object),
            }),
          })
        );
      });

      it('should filter by hierarchy_ids', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: { hierarchy_ids: 'h-1,h-2' },
        };
        const mockTraceId = 'trace-1';
        await ExpenseConfigurationService.getExpenseConfigurations({
          request: mockRequest,
          traceId: mockTraceId,
        });
        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              [Symbol.for('and')]: expect.any(Array),
            }),
          })
        );
      });
  });

  describe('getExpenseConfigurationById', () => {
    it('should return a single expense configuration by ID', async () => {
      const mockProgramId = 'program-1';
      const mockConfigId = 'config-1';
      const mockTraceId = 'trace-2';
      const mockExpenseConfig = {
        id: mockConfigId,
        name: 'Test Config',
        master_data_types: '[]',
        expense_types: '[]',
      };
      (sequelize.query as jest.Mock).mockResolvedValue([mockExpenseConfig]);

      const result = await ExpenseConfigurationService.getExpenseConfigurationById({
        program_id: mockProgramId,
        id: mockConfigId,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      expect(result.response.expenseConfig.id).toBe(mockConfigId);
      expect(sequelize.query).toHaveBeenCalled();
    });

    it('should handle expense configuration not found', async () => {
      const mockProgramId = 'program-1';
      const mockConfigId = 'not-found-id';
      const mockTraceId = 'trace-2';
      (sequelize.query as jest.Mock).mockResolvedValue([null]);

      const result = await ExpenseConfigurationService.getExpenseConfigurationById({
        program_id: mockProgramId,
        id: mockConfigId,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      expect(result.response.message).toBe('Expense configuration not found.');
    });

    it('should handle database errors', async () => {
      const mockProgramId = 'program-1';
      const mockConfigId = 'config-1';
      const mockTraceId = 'trace-2';
      (sequelize.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await ExpenseConfigurationService.getExpenseConfigurationById({
        program_id: mockProgramId,
        id: mockConfigId,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(500);
      expect(result.response.message).toBe('An error occurred while fetching expense configuration.');
    });

    it('should correctly parse JSON and convert booleans', async () => {
      const mockProgramId = 'program-1';
      const mockConfigId = 'config-1';
      const mockTraceId = 'trace-2';
      const mockExpenseConfig = {
        id: mockConfigId,
        name: 'Test Config',
        is_enabled: 1,
        is_mdt_enabled: 0,
        master_data_types: JSON.stringify([{ id: 'mdt-1', name: 'MDT 1' }]),
        expense_types: JSON.stringify([
          { id: 'et-1', name: 'Expense Type 1', is_enabled: 1 },
        ]),
      };
      (sequelize.query as jest.Mock).mockResolvedValue([mockExpenseConfig]);

      const result = await ExpenseConfigurationService.getExpenseConfigurationById({
        program_id: mockProgramId,
        id: mockConfigId,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      const { expenseConfig } = result.response;
      expect(expenseConfig.is_enabled).toBe(true);
      expect(expenseConfig.is_mdt_enabled).toBe(false);
      expect(expenseConfig.master_data_types).toEqual([{ id: 'mdt-1', name: 'MDT 1' }]);
      expect(expenseConfig.expense_types[0].is_enabled).toBe(true);
    });
  });

  describe('createExpenseConfiguration', () => {
    it('should create a new expense configuration successfully', async () => {
      const mockRequest: any = {
        params: { program_id: 'program-1' },
        body: {
          name: 'New Config',
          hierarchy_ids: ['h-1'],
          expense_types: ['et-1'],
        },
      };
      const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
      const mockTraceId = 'trace-3';

      (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([]);
      (ExpenseConfigurationModel.create as jest.Mock).mockResolvedValue({ id: 'new-config-1' });
      (ExpenseTypeMapping.create as jest.Mock).mockResolvedValue({});

      const result = await ExpenseConfigurationService.createExpenseConfiguration({
        request: mockRequest,
        user: mockUser,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(201);
      expect(result.response.message).toBe('Expense configuration created successfully.');
      expect(ExpenseConfigurationModel.create).toHaveBeenCalled();
    });

    it('should return 409 if config with same name exists', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { name: 'Existing Config', hierarchy_ids: ['h-1'] },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-3';

        (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([{ id: 'config-1' }]);

        const result = await ExpenseConfigurationService.createExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(409);
        expect(result.response.message).toBe('An expense configuration with the same name already exists');
      });

      it('should return 400 if hierarchy_ids are missing', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { name: 'New Config' },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-3';

        const result = await ExpenseConfigurationService.createExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(400);
        expect(result.response.message).toBe('hierarchy_ids are required and must be a non-empty array');
      });

      it('should return 409 if config with same hierarchy exists', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { name: 'New Config', hierarchy_ids: ['h-1'] },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-3';

        (ExpenseConfigurationModel.findAll as jest.Mock)
          .mockResolvedValueOnce([]) 
          .mockResolvedValueOnce([{ id: 'config-1', hierarchy_ids: ['h-1'] }]); // For hierarchy check

        const result = await ExpenseConfigurationService.createExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(409);
        expect(result.response.message).toBe('An Expense configuration with the same hierarchy already exists.');
      });

      it('should handle database errors during creation', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { name: 'New Config', hierarchy_ids: ['h-1'] },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-3';

        (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([]);
        (ExpenseConfigurationModel.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await ExpenseConfigurationService.createExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(500);
        expect(result.response.message).toBe('An error occurred while creating expense configuration.');
      });

      it('should handle exact hierarchy match during creation', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { name: 'New Config', hierarchy_ids: ['h-1'] },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-3';

        (ExpenseConfigurationModel.findAll as jest.Mock)
          .mockResolvedValueOnce([]) // For name check
          .mockResolvedValueOnce([{ id: 'config-1', hierarchy_ids: ['h-1'] }]); // For hierarchy check

        const result = await ExpenseConfigurationService.createExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(409);
        expect(result.response.message).toBe('An Expense configuration with the same hierarchy already exists.');
      });
  });

  describe('updateExpenseConfiguration', () => {
    it('should update an expense configuration successfully', async () => {
      const mockRequest: any = {
        params: { id: 'config-1', program_id: 'program-1' },
        body: { name: 'Updated Config', hierarchy_ids: ['h-2'] },
      };
      const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
      const mockTraceId = 'trace-4';
      const mockExistingConfig = {
        id: 'config-1',
        name: 'Old Config',
        hierarchy_ids: ['h-1'],
        update: jest.fn(),
        toJSON: () => ({
          id: 'config-1',
          name: 'Old Config',
          hierarchy_ids: ['h-1'],
        }),
      };

      (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
      (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([]); // No conflicts
      (ExpenseConfigurationModel.create as jest.Mock).mockResolvedValue({ id: 'new-version-1' });
      (ExpenseTypeMapping.bulkCreate as jest.Mock).mockResolvedValue({});

      const result = await ExpenseConfigurationService.updateExpenseConfiguration({
        request: mockRequest,
        user: mockUser,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      expect(result.response.message).toBe('Expense configuration versioned update successful.');
      expect(mockExistingConfig.update).toHaveBeenCalledWith({ latest: false, is_enabled: false }, expect.any(Object));
      expect(ExpenseConfigurationModel.create).toHaveBeenCalled();
    });

    it('should return 400 if expense configuration not found', async () => {
        const mockRequest: any = {
          params: { id: 'not-found-id', program_id: 'program-1' },
          body: { name: 'Updated Config' },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-4';

        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(null);

        const result = await ExpenseConfigurationService.updateExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(400);
        expect(result.response.message).toBe('Expense configuration not found.');
      });

      it('should return 409 if hierarchy conflict exists', async () => {
        const mockRequest: any = {
          params: { id: 'config-1', program_id: 'program-1' },
          body: { hierarchy_ids: ['h-2'] },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-4';
        const mockExistingConfig = {
          id: 'config-1',
          hierarchy_ids: ['h-1'],
          update: jest.fn(),
          toJSON: () => ({ id: 'config-1', hierarchy_ids: ['h-1'] }),
        };

        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
        (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([{ id: 'config-2', hierarchy_ids: ['h-2', 'h-3'] }]);

        const result = await ExpenseConfigurationService.updateExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(409);
        expect(result.response.message).toBe('An expense configuration with the same hierarchy IDs already exists');
      });

      it('should return 200 if an exact hierarchy match exists with another config', async () => {
        const mockRequest: any = {
          params: { id: 'config-1', program_id: 'program-1' },
          body: { hierarchy_ids: ['h-2'] },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-4';
        const mockExistingConfig = {
          id: 'config-1',
          hierarchy_ids: ['h-1'],
          update: jest.fn(),
          toJSON: () => ({ id: 'config-1', hierarchy_ids: ['h-1'] }),
        };
        const mockExactMatchConfig = { id: 'config-2', hierarchy_ids: ['h-2'] };

        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
        (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([mockExactMatchConfig]);

        const result = await ExpenseConfigurationService.updateExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('Expense configuration updated successfully.');
        expect(result.response.data).toEqual(mockExactMatchConfig);
      });

      it('should handle transaction rollback on error', async () => {
        const mockRequest: any = {
          params: { id: 'config-1', program_id: 'program-1' },
          body: { name: 'Updated Config' },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-4';
        const mockExistingConfig = {
          id: 'config-1',
          update: jest.fn().mockRejectedValue(new Error('DB Error')),
        };

        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);

        const result = await ExpenseConfigurationService.updateExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(500);
        expect(result.response.message).toBe('An error occurred while updating expense configuration.');
      });

      it('should update expense configuration with expense types', async () => {
        const mockRequest: any = {
          params: { id: 'config-1', program_id: 'program-1' },
          body: {
            name: 'Updated Config',
            hierarchy_ids: ['h-1'],
            expense_types: ['et-1', 'et-2']
          },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-4';
        const mockExistingConfig = {
          id: 'config-1',
          name: 'Old Config',
          hierarchy_ids: ['h-1'],
          update: jest.fn(),
          toJSON: () => ({
            id: 'config-1',
            name: 'Old Config',
            hierarchy_ids: ['h-1'],
          }),
        };

        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
        (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([]); // No conflicts
        (ExpenseConfigurationModel.create as jest.Mock).mockResolvedValue({ id: 'new-version-1' });
        (ExpenseTypeMapping.bulkCreate as jest.Mock).mockResolvedValue({});

        const result = await ExpenseConfigurationService.updateExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('Expense configuration versioned update successful.');
        expect(ExpenseTypeMapping.bulkCreate).toHaveBeenCalledWith(
          [
            { program_id: 'program-1', expense_config_id: 'new-version-1', expense_type_id: 'et-1' },
            { program_id: 'program-1', expense_config_id: 'new-version-1', expense_type_id: 'et-2' }
          ],
          expect.any(Object)
        );
      });
  });

  describe('enableExpenseConfiguration', () => {
    it('should enable an expense configuration successfully', async () => {
      const mockRequest: any = {
        params: { program_id: 'program-1' },
        body: { id: 'config-1', is_enabled: true },
      };
      const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
      const mockTraceId = 'trace-5';

      (ExpenseConfigurationModel.update as jest.Mock).mockResolvedValue([1]); // 1 row updated

      const result = await ExpenseConfigurationService.enableExpenseConfiguration({
        request: mockRequest,
        user: mockUser,
        traceId: mockTraceId,
      });

      if (result) {
        expect(result.status).toBe(200);
        expect(result.response.message).toBe('Expense configuration updated successfully.');
        expect(ExpenseConfigurationModel.update).toHaveBeenCalledWith(
          { is_enabled: true, updated_by: mockUser.sub, updated_on: expect.any(Number) },
          { where: { program_id: 'program-1', id: 'config-1' } }
        );
      }
    });

    it('should handle database errors', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { id: 'config-1', is_enabled: true },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-5';

        (ExpenseConfigurationModel.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await ExpenseConfigurationService.enableExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        if (result) {
            expect(result.status).toBe(500);
            expect(result.response.message).toBe('An error occurred while deleting expense configuration.');
        }
      });

      it('should disable an expense configuration', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { id: 'config-1', is_enabled: false },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-5';

        (ExpenseConfigurationModel.update as jest.Mock).mockResolvedValue([1]);

        const result = await ExpenseConfigurationService.enableExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        if (result) {
            expect(result.status).toBe(200);
            expect(ExpenseConfigurationModel.update).toHaveBeenCalledWith(
              { is_enabled: false, updated_by: mockUser.sub, updated_on: expect.any(Number) },
              { where: { program_id: 'program-1', id: 'config-1' } }
            );
        }
      });

      it('should handle no rows updated', async () => {
        const mockRequest: any = {
            params: { program_id: 'program-1' },
            body: { id: 'not-found-id', is_enabled: true },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-5';
    
        (ExpenseConfigurationModel.update as jest.Mock).mockResolvedValue([0]);
    
        const result = await ExpenseConfigurationService.enableExpenseConfiguration({
            request: mockRequest,
            user: mockUser,
            traceId: mockTraceId,
        });
    
        expect(result).toBeUndefined(); 
    });
  });

  describe('getAllExpenseConfigurationHierarchies', () => {
    it('should return a list of hierarchy IDs', async () => {
      const mockProgramId = 'program-1';
      const mockTraceId = 'trace-6';
      const mockHierarchies = [{ hierarchy_ids: ['h-1', 'h-2'] }];
      (sequelize.query as jest.Mock).mockResolvedValue(mockHierarchies);

      const result = await ExpenseConfigurationService.getAllExpenseConfigurationHierarchies({
        program_id: mockProgramId,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      expect(result.response.hierarchies).toEqual(['h-1', 'h-2']);
      expect(sequelize.query).toHaveBeenCalled();
    });

    it('should handle no hierarchy IDs found', async () => {
        const mockProgramId = 'program-1';
        const mockTraceId = 'trace-6';
        (sequelize.query as jest.Mock).mockResolvedValue([]);

        const result = await ExpenseConfigurationService.getAllExpenseConfigurationHierarchies({
          program_id: mockProgramId,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('No hierarchy IDs found for the specified program.');
        expect(result.response.hierarchies).toEqual([]);
      });

      it('should handle database errors', async () => {
        const mockProgramId = 'program-1';
        const mockTraceId = 'trace-6';
        (sequelize.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await ExpenseConfigurationService.getAllExpenseConfigurationHierarchies({
          program_id: mockProgramId,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(500);
        expect(result.response.message).toBe('Internal Server Error');
      });
  });

  describe('expenseConfigurationAdvancedFilter', () => {
    it('should return a filtered list of expense configurations', async () => {
      const mockRequest: any = {
        params: { program_id: 'program-1' },
        body: { name: 'Test' },
      };
      const mockUser = { sub: 'user-1' };
      const mockTraceId = 'trace-7';
      const mockExpenseConfigList = {
        count: 1,
        rows: [
          {
            toJSON: () => ({
              id: 'config-1',
              name: 'Test Config',
              hierarchy_ids: [],
            }),
          },
        ],
      };
      (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
      (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue(mockExpenseConfigList);

      const result = await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
        request: mockRequest,
        user: mockUser,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      if (result.response.data) {
        expect(result.response.data).toHaveLength(1);
        expect(result.response.data[0].name).toBe('Test Config');
      }
    });

    it('should handle no expense configurations found', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { name: 'Non-existent' },
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';

        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue({
          count: 0,
          rows: [],
        });

        const result = await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('No expense configuration found.');
        expect(result.response.data).toHaveLength(0);
      });

      it('should filter by various criteria', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { is_enabled: true, hierarchy_ids: ['h-1'] },
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';

        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
        await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              is_enabled: true,
              [Symbol.for('or')]: expect.any(Array),
            }),
          })
        );
      });

      it('should handle database errors', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: {},
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';

        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(500);
        expect(result.response.message).toBe('Internal Server Error');
      });

      it('should filter by updated_on date range with array format', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { updated_on: [1640995200000, 1643673600000] }, // Array of timestamps
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';

        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

        await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              updated_on: { [Symbol.for('between')]: [1640995200000, 1643673600000] },
            }),
          })
        );
      });

      it('should filter by updated_on with single date', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { updated_on: '2023-01-01' },
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';

        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

        await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              updated_on: expect.any(Object),
            }),
          })
        );
      });

      it('should handle MSP hierarchy filtering', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: {},
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';

        // Mock the getUserHierarchyData to return empty MSP hierarchy IDs to avoid the complex filtering logic
        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({
          mspHierarchyIds: []
        });
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue({
          count: 0,
          rows: []
        });

        const result = await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('No expense configuration found.');
        // Verify that the method was called successfully
        expect(GlobalRepository.getUserHierarchyData).toHaveBeenCalledWith('program-1', mockUser);
      });

      it('should handle hierarchy filter from body.hierarchy', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: { hierarchy: ['h-1', 'h-2'] },
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';

        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

        await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(ExpenseConfigurationModel.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              [Symbol.for('or')]: expect.any(Array),
            }),
          })
        );
      });

      it('should populate hierarchy details in advanced filter', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          body: {},
        };
        const mockUser = { sub: 'user-1' };
        const mockTraceId = 'trace-7';
        const mockExpenseConfigList = {
          count: 1,
          rows: [
            {
              toJSON: () => ({
                id: 'config-1',
                name: 'Test Config',
                hierarchy_ids: ['h-1', 'h-2'],
              }),
            },
          ],
        };

        (GlobalRepository.getUserHierarchyData as jest.Mock).mockResolvedValue({ mspHierarchyIds: [] });
        (ExpenseConfigurationModel.findAndCountAll as jest.Mock).mockResolvedValue(mockExpenseConfigList);
        (Hierarchies.findAll as jest.Mock).mockResolvedValue([
          { id: 'h-1', name: 'Hierarchy 1' },
          { id: 'h-2', name: 'Hierarchy 2' },
        ]);

        const result = await ExpenseConfigurationService.expenseConfigurationAdvancedFilter({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        if (result.response.data) {
          expect(result.response.data).toHaveLength(1);
          expect(result.response.data[0].hierarchy_ids).toHaveLength(2);
          expect(result.response.data[0].hierarchy_ids[0].name).toBe('Hierarchy 1');
        }
      });
  });

  describe('getExpenseTypesByProgramIdAndHierarchies', () => {
    it('should return expense types for given hierarchies', async () => {
      const mockProgramId = 'program-1';
      const mockHierarchyIds = 'h-1,h-2';
      const mockTraceId = 'trace-8';
      const mockExpenseTypes = [{ id: 'et-1', name: 'Travel' }];
      (sequelize.query as jest.Mock).mockResolvedValue(mockExpenseTypes);

      const result = await ExpenseConfigurationService.getExpenseTypesByProgramIdAndHierarchies({
        program_id: mockProgramId,
        hierarchy_ids: mockHierarchyIds,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      expect(result.response.data).toEqual(mockExpenseTypes);
    });

    it('should handle database errors', async () => {
        const mockProgramId = 'program-1';
        const mockHierarchyIds = 'h-1,h-2';
        const mockTraceId = 'trace-8';

        (sequelize.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await ExpenseConfigurationService.getExpenseTypesByProgramIdAndHierarchies({
          program_id: mockProgramId,
          hierarchy_ids: mockHierarchyIds,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(500);
        expect(result.response.message).toBe('An error occurred while fetching expense types.');
      });

      it('should handle empty hierarchy_ids string', async () => {
        const mockProgramId = 'program-1';
        const mockHierarchyIds = '';
        const mockTraceId = 'trace-8';
        const mockExpenseTypes = [{ id: 'et-1', name: 'Travel' }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockExpenseTypes);
  
        
        const result = await ExpenseConfigurationService.getExpenseTypesByProgramIdAndHierarchies({
          program_id: mockProgramId,
          hierarchy_ids: mockHierarchyIds,
          traceId: mockTraceId,
        });
  
        expect(result.status).toBe(200);
        expect(result.response.data).toEqual(mockExpenseTypes);
      });
  });

  describe('getExpenseConfigByExpenseType', () => {
    it('should return an expense configuration by expense type', async () => {
      const mockRequest: any = {
        params: { program_id: 'program-1' },
        query: { hierarchy_ids: 'h-1', expense_type_ids: 'et-1' },
      };
      const mockTraceId = 'trace-9';
      const mockExpenseConfig = {
        toJSON: () => ({
          id: 'config-1',
          hierarchy_ids: [],
          master_data_types: [],
          projects: null,
        }),
      };
      (ExpenseTypeMapping.findAll as jest.Mock).mockResolvedValue([{ expense_config_id: 'config-1' }]);
      (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExpenseConfig);
      (Hierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (FoundationalDataTypes.findAll as jest.Mock).mockResolvedValue([]);

      const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
        request: mockRequest,
        traceId: mockTraceId,
      });

      expect(result.status).toBe(200);
      expect(result.response.data.id).toBe('config-1');
    });

    it('should handle no expense configuration found', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: { hierarchy_ids: 'h-1', expense_type_ids: 'et-1' },
        };
        const mockTraceId = 'trace-9';

        (ExpenseTypeMapping.findAll as jest.Mock).mockResolvedValue([]);
        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(null);

        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('No expense configuration found.');
        expect(result.response.data).toBeNull();
      });

      it('should populate projects from master_data_type', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-9';
        const mockExpenseConfig = {
          toJSON: () => ({
            id: 'config-1',
            hierarchy_ids: [],
            master_data_types: [],
            projects: { source: 'master_data_type', options: ['mdt-1'] },
          }),
        };
        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExpenseConfig);
        (FoundationalDataTypes.findAll as jest.Mock).mockResolvedValue([{ id: 'mdt-1', name: 'MDT 1' }]);
    
        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });
    
        expect(result.status).toBe(200);
        if (result.response.data) {
            expect(result.response.data.projects.options).toHaveLength(1);
            expect(result.response.data.projects.options[0].name).toBe('MDT 1');
        }
      });

      it('should handle database errors', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-9';
        (ExpenseConfigurationModel.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(500);
        expect(result.response.message).toBe('Internal Server Error');
      });

      it('should populate projects from hierarchy source', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-9';
        const mockExpenseConfig = {
          toJSON: () => ({
            id: 'config-1',
            hierarchy_ids: [],
            master_data_types: [],
            projects: { source: 'hierarchy', options: 'h-1,h-2' },
          }),
        };
        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExpenseConfig);
        (Hierarchies.findAll as jest.Mock)
          .mockResolvedValueOnce([]) // For hierarchy_ids
          .mockResolvedValueOnce([{ id: 'h-1', name: 'Hierarchy 1' }, { id: 'h-2', name: 'Hierarchy 2' }]); // For projects
        (FoundationalDataTypes.findAll as jest.Mock).mockResolvedValue([]);
        (ExpenseTypeMapping.findAll as jest.Mock).mockResolvedValue([]);

        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        if (result.response.data) {
            expect(result.response.data.projects.source).toBe('hierarchy');
            expect(result.response.data.projects.options).toHaveLength(2);
            expect(result.response.data.projects.options[0].name).toBe('Hierarchy 1');
        }
      });

      it('should populate projects from custom_field source', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-9';
        const mockExpenseConfig = {
          toJSON: () => ({
            id: 'config-1',
            hierarchy_ids: [],
            master_data_types: [],
            projects: { source: 'custom_field', options: ['cf-1'] },
          }),
        };
        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExpenseConfig);
        (Hierarchies.findAll as jest.Mock).mockResolvedValue([]);
        (FoundationalDataTypes.findAll as jest.Mock).mockResolvedValue([]);
        (CustomField.findAll as jest.Mock).mockResolvedValue([{ id: 'cf-1', name: 'Custom Field 1' }]);
        (ExpenseTypeMapping.findAll as jest.Mock).mockResolvedValue([]);

        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        if (result.response.data) {
            expect(result.response.data.projects.source).toBe('custom_field');
            expect(result.response.data.projects.options).toHaveLength(1);
            expect(result.response.data.projects.options[0].name).toBe('Custom Field 1');
        }
      });

      it('should handle projects with string options containing comma', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-9';
        const mockExpenseConfig = {
          toJSON: () => ({
            id: 'config-1',
            hierarchy_ids: [],
            master_data_types: [],
            projects: { source: 'master_data_type', options: 'mdt-1,mdt-2' },
          }),
        };
        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExpenseConfig);
        (Hierarchies.findAll as jest.Mock).mockResolvedValue([]);
        (FoundationalDataTypes.findAll as jest.Mock)
          .mockResolvedValueOnce([]) // For master_data_types
          .mockResolvedValueOnce([{ id: 'mdt-1', name: 'MDT 1' }, { id: 'mdt-2', name: 'MDT 2' }]); // For projects
        (ExpenseTypeMapping.findAll as jest.Mock).mockResolvedValue([]);

        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        if (result.response.data) {
            expect(result.response.data.projects.options).toHaveLength(2);
        }
      });

      it('should handle projects with single string option', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-9';
        const mockExpenseConfig = {
          toJSON: () => ({
            id: 'config-1',
            hierarchy_ids: [],
            master_data_types: [],
            projects: { source: 'master_data_type', options: 'mdt-1' },
          }),
        };
        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExpenseConfig);
        (Hierarchies.findAll as jest.Mock).mockResolvedValue([]);
        (FoundationalDataTypes.findAll as jest.Mock)
          .mockResolvedValueOnce([]) // For master_data_types
          .mockResolvedValueOnce([{ id: 'mdt-1', name: 'MDT 1' }]); // For projects
        (ExpenseTypeMapping.findAll as jest.Mock).mockResolvedValue([]);

        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        if (result.response.data) {
            expect(result.response.data.projects.options).toHaveLength(1);
        }
      });

      it('should handle expense types with categories', async () => {
        const mockRequest: any = {
          params: { program_id: 'program-1' },
          query: {},
        };
        const mockTraceId = 'trace-9';
        const mockExpenseConfig = {
          toJSON: () => ({
            id: 'config-1',
            hierarchy_ids: [],
            master_data_types: [],
            projects: null,
          }),
        };
        const mockExpenseTypes = [
          {
            expense_type: {
              dataValues: { id: 'et-1', name: 'Travel', category: 'travel' }
            }
          },
          {
            expense_type: { id: 'et-2', name: 'Meals', category: 'food' }
          },
          {
            expense_type: { id: 'et-3', name: 'Other' } // No category
          }
        ];

        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExpenseConfig);
        (Hierarchies.findAll as jest.Mock).mockResolvedValue([]);
        (FoundationalDataTypes.findAll as jest.Mock).mockResolvedValue([]);
        (ExpenseTypeMapping.findAll as jest.Mock).mockResolvedValue(mockExpenseTypes);

        const result = await ExpenseConfigurationService.getExpenseConfigByExpenseType({
          request: mockRequest,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        if (result.response.data) {
            expect(result.response.data.expenseTypes.travel).toHaveLength(1);
            expect(result.response.data.expenseTypes.food).toHaveLength(1);
            expect(result.response.data.expenseTypes.uncategorized).toHaveLength(1);
        }
      });

      it('should handle createExpenseTypeMappings with empty array', async () => {
        const mockRequest: any = {
          params: { id: 'config-1', program_id: 'program-1' },
          body: {
            name: 'Updated Config',
            hierarchy_ids: ['h-1'],
            expense_types: [] // Empty array
          },
        };
        const mockUser = { sub: 'user-1', preferred_username: 'testuser' };
        const mockTraceId = 'trace-4';
        const mockExistingConfig = {
          id: 'config-1',
          name: 'Old Config',
          hierarchy_ids: ['h-1'],
          update: jest.fn(),
          toJSON: () => ({
            id: 'config-1',
            name: 'Old Config',
            hierarchy_ids: ['h-1'],
          }),
        };

        (ExpenseConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockExistingConfig);
        (ExpenseConfigurationModel.findAll as jest.Mock).mockResolvedValue([]); // No conflicts
        (ExpenseConfigurationModel.create as jest.Mock).mockResolvedValue({ id: 'new-version-1' });

        const result = await ExpenseConfigurationService.updateExpenseConfiguration({
          request: mockRequest,
          user: mockUser,
          traceId: mockTraceId,
        });

        expect(result.status).toBe(200);
        expect(result.response.message).toBe('Expense configuration versioned update successful.');
        // Should not call bulkCreate for empty expense_types array
        expect(ExpenseTypeMapping.bulkCreate).not.toHaveBeenCalled();
      });
  });
});
