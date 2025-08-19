// Mock Sequelize before any imports
const mockSequelize = {
  transaction: jest.fn(),
  define: jest.fn(),
  init: jest.fn(),
  sync: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  fn: jest.fn(),
  col: jest.fn(),
};

jest.mock('sequelize', () => ({
  Sequelize: jest.fn(() => mockSequelize),
  Model: class MockModel {
    static init() {}
    static findOne() {}
    static findAll() {}
    static create() {}
    static update() {}
    static findAndCountAll() {}
    static bulkCreate() {}
    static destroy() {}
    static belongsTo() {}
    static hasMany() {}
    static hasOne() {}
    static belongsToMany() {}
  },
  DataTypes: {
    UUID: jest.fn(),
    UUIDV4: jest.fn(),
    STRING: jest.fn(),
    TEXT: jest.fn(),
    BOOLEAN: jest.fn(),
    INTEGER: jest.fn(),
    BIGINT: jest.fn(),
    DATE: jest.fn(),
    JSON: jest.fn(),
    ENUM: jest.fn(),
  },
  Op: {
    like: Symbol('like'),
    in: Symbol('in'),
    between: Symbol('between'),
    gte: Symbol('gte'),
    lte: Symbol('lte'),
    ne: Symbol('ne'),
  },
  QueryTypes: {
    SELECT: 'SELECT',
  },
}));

// Mock the database instance
jest.mock('../../src/config/instance', () => ({
  sequelize: mockSequelize,
}));

// Mock models
jest.mock('../../src/models/shift-configuration.model', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/shift-type.model', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/models/shift-configuration-hierarchies.model', () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
  bulkCreate: jest.fn(),
}));

jest.mock('../../src/models/hierarchies.model', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../src/models/shift-type-configuration.model', () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
  bulkCreate: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../src/utility/queries', () => ({
  sameShiftConfiguration: 'SELECT * FROM shift_configurations WHERE program_id = :program_id',
}));

import ShiftConfigurationService from '../../src/service/shift-configuration.service';
import ShiftConfiguration from '../../src/models/shift-configuration.model';
import ShiftType from '../../src/models/shift-type.model';
import shiftConfigurationHierarchies from '../../src/models/shift-configuration-hierarchies.model';
import hierarchies from '../../src/models/hierarchies.model';
import shiftTypeConfiguration from '../../src/models/shift-type-configuration.model';

describe('ShiftConfigurationService', () => {
  let service: ShiftConfigurationService;
  let mockTransaction: any;

  beforeEach(() => {
    service = new ShiftConfigurationService();
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    mockSequelize.transaction.mockResolvedValue(mockTransaction);
    jest.clearAllMocks();
  });

  describe('getAllShiftConfigurations', () => {
    // Positive test cases
    it('should return shift configurations with pagination', async () => {
      const mockShiftConfigs = [
        { id: '1', name: 'Config 1', toJSON: () => ({ id: '1', name: 'Config 1' }) },
        { id: '2', name: 'Config 2', toJSON: () => ({ id: '2', name: 'Config 2' }) },
      ];

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockShiftConfigs,
      });

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: '1', hierarchy_id: 'h1' },
      ]);

      (hierarchies.findAll as jest.Mock).mockResolvedValue([
        { id: 'h1', name: 'Hierarchy 1' },
      ]);

      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: '1', shift_type_id: 's1' },
      ]);

      (ShiftType.findAll as jest.Mock).mockResolvedValue([
        { id: 's1', shift_type_name: 'Shift Type 1', created_on: new Date() },
      ]);

      const result = await service.getAllShiftConfigurations({
        program_id: 'prog1',
        page: '1',
        limit: '10',
      });

      expect(result.shiftConfigurations).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total_records).toBe(2);
    });

    it('should filter by name when provided', async () => {
      const mockShiftConfigs = [
        { id: '1', name: 'Test Config', toJSON: () => ({ id: '1', name: 'Test Config' }) },
      ];

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: mockShiftConfigs,
      });

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (hierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([]);
      (ShiftType.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllShiftConfigurations({
        program_id: 'prog1',
        name: 'Test',
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({})
          })
        })
      );
      expect(result.shiftConfigurations).toHaveLength(1);
    });

    it('should filter by is_enabled when provided', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        is_enabled: 'true',
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_enabled: true
          })
        })
      );
    });

    it('should filter by date range when start_date and end_date provided', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        start_date: '2023-01-01',
        end_date: '2023-12-31',
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updated_on: expect.objectContaining({})
          })
        })
      );
    });

    it('should filter by hierarchy_ids when provided', async () => {
      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        hierarchy_ids: 'h1,h2',
      });

      expect(shiftConfigurationHierarchies.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hierarchy_id: expect.objectContaining({})
          }),
          attributes: ['shift_config_id']
        })
      );
    });

    it('should filter by hierarchy_names when provided', async () => {
      (hierarchies.findAll as jest.Mock).mockResolvedValue([
        { id: 'h1' },
      ]);

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        hierarchy_names: 'Test Hierarchy',
      });

      expect(hierarchies.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({})
          }),
          attributes: ['id']
        })
      );
    });

    it('should filter by shift_type_name when provided', async () => {
      (ShiftType.findAll as jest.Mock).mockResolvedValue([
        { id: 's1' },
      ]);

      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        shift_type_name: 'Day Shift',
      });

      expect(ShiftType.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shift_type_name: expect.objectContaining({})
          }),
          attributes: ['id']
        })
      );
    });

    // Negative test cases
    it('should return empty array when no configurations found', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      const result = await service.getAllShiftConfigurations({
        program_id: 'prog1',
      });

      expect(result.shiftConfigurations).toEqual([]);
      expect(result.total_records).toBe(0);
    });

    it('should handle invalid page and limit parameters gracefully', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      const result = await service.getAllShiftConfigurations({
        program_id: 'prog1',
        page: 'invalid',
        limit: 'invalid',
      });

      expect(result.page).toBe(NaN);
      expect(result.limit).toBe(NaN);
    });

    it('should handle database errors gracefully', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.getAllShiftConfigurations({
        program_id: 'prog1',
      })).rejects.toThrow('Database connection failed');
    });

    it('should filter by start_date only when provided', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        start_date: '2023-01-01',
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updated_on: expect.objectContaining({})
          })
        })
      );
    });

    it('should filter by end_date only when provided', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        end_date: '2023-12-31',
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updated_on: expect.objectContaining({})
          })
        })
      );
    });

    it('should handle shift type filtering with existing shift config ids', async () => {
      // First set up hierarchy filtering to populate shiftConfigIds
      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftType.findAll as jest.Mock).mockResolvedValue([
        { id: 's1' },
      ]);

      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getAllShiftConfigurations({
        program_id: 'prog1',
        hierarchy_ids: 'h1',
        shift_type_name: 'Day Shift',
      });

      expect(ShiftType.findAll).toHaveBeenCalled();
      expect(shiftTypeConfiguration.findAll).toHaveBeenCalled();
    });
  });

  describe('getShiftConfigurationById', () => {
    // Positive test cases
    it('should return shift configuration by id with hierarchies and shift types', async () => {
      const mockShiftConfig = {
        id: '1',
        name: 'Config 1',
        program_id: 'prog1',
        toJSON: () => ({ id: '1', name: 'Config 1', program_id: 'prog1' }),
      };

      const mockHierarchyRecords = [
        { shift_config_id: '1', hierarchy_id: 'h1' },
      ];

      const mockHierarchies = [
        { id: 'h1', name: 'Hierarchy 1' },
      ];

      const mockShiftTypeRecords = [
        { shift_config_id: '1', shift_type_id: 's1', time_duration: 8, shift_type_time: [] },
      ];

      const mockShiftTypes = [
        { id: 's1', shift_type_name: 'Day Shift', created_on: new Date() },
      ];

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(mockShiftConfig);
      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue(mockHierarchyRecords);
      (hierarchies.findAll as jest.Mock).mockResolvedValue(mockHierarchies);
      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue(mockShiftTypeRecords);
      (ShiftType.findAll as jest.Mock).mockResolvedValue(mockShiftTypes);

      const result = await service.getShiftConfigurationById('1', 'prog1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Config 1');
      expect(result?.hierarchies).toHaveLength(1);
      expect(result?.shift_types).toHaveLength(1);
      expect(result?.shift_types[0].shift_type_name).toBe('Day Shift');
    });

    it('should return configuration with empty hierarchies and shift types when none exist', async () => {
      const mockShiftConfig = {
        id: '1',
        name: 'Config 1',
        toJSON: () => ({ id: '1', name: 'Config 1' }),
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(mockShiftConfig);
      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (hierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([]);
      (ShiftType.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.getShiftConfigurationById('1', 'prog1');

      expect(result).toBeDefined();
      expect(result?.hierarchies).toEqual([]);
      expect(result?.shift_types).toEqual([]);
    });

    // Negative test cases
    it('should return null when configuration not found', async () => {
      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getShiftConfigurationById('1', 'prog1');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      (ShiftConfiguration.findOne as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.getShiftConfigurationById('1', 'prog1')).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid parameters', async () => {
      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getShiftConfigurationById('', '');

      expect(result).toBeNull();
      expect(ShiftConfiguration.findOne).toHaveBeenCalledWith({
        where: {
          id: '',
          program_id: '',
          is_deleted: false,
        },
      });
    });
  });

  describe('createShiftConfiguration', () => {
    // Positive test cases
    it('should create shift configuration successfully with hierarchies and shift types', async () => {
      const mockData = {
        shift_configuration_name: 'New Config',
        id: 'new-id',
        name: 'New Config',
        program_id: 'prog1',
        hierarchy_ids: ['h1', 'h2'],
        job_template_ids: [],
        shift_type: [
          {
            shift_type_id: 's1',
            shift_type_time: [
              { shift_start_time: '09:00', shift_end_time: '17:00' }
            ],
            time_duration: 8
          }
        ],
        is_enabled: true,
        is_deleted: false,
        created_by: 'user1',
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);
      (mockSequelize.query as jest.Mock).mockResolvedValue([]);
      (ShiftConfiguration.create as jest.Mock).mockResolvedValue({
        id: 'new-id',
        program_id: 'prog1'
      });
      (shiftConfigurationHierarchies.bulkCreate as jest.Mock).mockResolvedValue([]);
      (shiftTypeConfiguration.create as jest.Mock).mockResolvedValue({});

      const result = await service.createShiftConfiguration(mockData, 'user1');

      expect(result.id).toBe('new-id');
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(ShiftConfiguration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Config',
          program_id: 'prog1',
          is_enabled: true,
          created_by: 'user1',
        }),
        { transaction: mockTransaction }
      );
    });

    it('should create shift configuration without hierarchies', async () => {
      const mockData = {
        shift_configuration_name: 'Config Without Hierarchies',
        id: 'new-id-2',
        name: 'Config Without Hierarchies',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);
      (ShiftConfiguration.create as jest.Mock).mockResolvedValue({
        id: 'new-id',
        program_id: 'prog1'
      });

      const result = await service.createShiftConfiguration(mockData, 'user1');

      expect(result.id).toBe('new-id');
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(shiftConfigurationHierarchies.bulkCreate).not.toHaveBeenCalled();
    });

    it('should create shift configuration without shift types', async () => {
      const mockData = {
        shift_configuration_name: 'Config Without Shift Types',
        id: 'new-id-3',
        name: 'Config Without Shift Types',
        program_id: 'prog1',
        hierarchy_ids: ['h1'],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);
      (mockSequelize.query as jest.Mock).mockResolvedValue([]);
      (ShiftConfiguration.create as jest.Mock).mockResolvedValue({
        id: 'new-id',
        program_id: 'prog1'
      });
      (shiftConfigurationHierarchies.bulkCreate as jest.Mock).mockResolvedValue([]);

      const result = await service.createShiftConfiguration(mockData, 'user1');

      expect(result.id).toBe('new-id');
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(shiftTypeConfiguration.create).not.toHaveBeenCalled();
    });

    // Negative test cases
    it('should throw error when configuration with same name exists', async () => {
      const mockData = {
        shift_configuration_name: 'Existing Config',
        id: 'existing-id',
        name: 'Existing Config',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.createShiftConfiguration(mockData, 'user1')).rejects.toThrow(
        'Shift configuration with the name Existing Config already exists'
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error when configuration with same hierarchy already exists', async () => {
      const mockData = {
        shift_configuration_name: 'New Config',
        id: 'new-config-id',
        name: 'New Config',
        program_id: 'prog1',
        hierarchy_ids: ['h1'],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);
      (mockSequelize.query as jest.Mock).mockResolvedValue([{ id: 'existing-config' }]);

      await expect(service.createShiftConfiguration(mockData, 'user1')).rejects.toThrow(
        'Shift configurations with the same hierarchy already exist.'
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should handle database errors during creation', async () => {
      const mockData = {
        shift_configuration_name: 'New Config',
        id: 'error-config-id',
        name: 'New Config',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);
      (ShiftConfiguration.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.createShiftConfiguration(mockData, 'user1')).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const mockData = {
        shift_configuration_name: '',
        id: '',
        name: '',
        program_id: '',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: false,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);
      (ShiftConfiguration.create as jest.Mock).mockRejectedValue(
        new Error('Validation error')
      );

      await expect(service.createShiftConfiguration(mockData, 'user1')).rejects.toThrow(
        'Validation error'
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('updateShiftConfiguration', () => {
    // Positive test cases
    it('should update shift configuration successfully with new hierarchies', async () => {
      const mockShiftConfig = {
        id: '1',
        program_id: 'prog1',
        update: jest.fn(),
      };

      const mockData = {
        shift_configuration_name: 'Updated Config',
        id: '1',
        name: 'Updated Config',
        program_id: 'prog1',
        hierarchy_ids: ['h1', 'h2'],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
        updated_by: 'user1',
      };

      (ShiftConfiguration.findOne as jest.Mock)
        .mockResolvedValueOnce(mockShiftConfig) // First call for finding the config
        .mockResolvedValueOnce(null); // Second call for checking duplicate name

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { hierarchy_id: 'h3' } // Existing hierarchy
      ]);
      (shiftConfigurationHierarchies.destroy as jest.Mock).mockResolvedValue(1);
      (shiftConfigurationHierarchies.bulkCreate as jest.Mock).mockResolvedValue([]);
      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.updateShiftConfiguration('1', 'prog1', mockData, 'user1');

      expect(result.success).toBe(true);
      expect(mockShiftConfig.update).toHaveBeenCalled();
      expect(shiftConfigurationHierarchies.destroy).toHaveBeenCalled();
      expect(shiftConfigurationHierarchies.bulkCreate).toHaveBeenCalled();
    });

    it('should update shift configuration with new shift types', async () => {
      const mockShiftConfig = {
        id: '1',
        program_id: 'prog1',
        update: jest.fn(),
      };

      const mockData = {
        shift_configuration_name: 'Updated Config',
        id: '1',
        name: 'Updated Config',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [
          {
            shift_type_id: 's1',
            shift_type_time: [{ shift_start_time: '09:00', shift_end_time: '17:00' }],
            time_duration: 8
          },
          {
            shift_type_id: 's2',
            shift_type_time: [],
            time_duration: 12
          }
        ],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock)
        .mockResolvedValueOnce(mockShiftConfig)
        .mockResolvedValueOnce(null);

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_type_id: 's3' } // Existing shift type to be removed
      ]);
      (shiftTypeConfiguration.destroy as jest.Mock).mockResolvedValue(1);
      (shiftTypeConfiguration.bulkCreate as jest.Mock).mockResolvedValue([]);

      const result = await service.updateShiftConfiguration('1', 'prog1', mockData, 'user1');

      expect(result.success).toBe(true);
      expect(shiftTypeConfiguration.destroy).toHaveBeenCalled();
      expect(shiftTypeConfiguration.bulkCreate).toHaveBeenCalled();
    });

    it('should update existing shift types without creating new ones', async () => {
      const mockShiftConfig = {
        id: '1',
        program_id: 'prog1',
        update: jest.fn(),
      };

      const mockData = {
        shift_configuration_name: 'Updated Config',
        id: '1',
        name: 'Updated Config',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [
          {
            shift_type_id: 's1',
            shift_type_time: [{ shift_start_time: '10:00', shift_end_time: '18:00' }],
            time_duration: 8
          }
        ],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock)
        .mockResolvedValueOnce(mockShiftConfig)
        .mockResolvedValueOnce(null);

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_type_id: 's1' } // Existing shift type to be updated
      ]);
      (shiftTypeConfiguration.update as jest.Mock).mockResolvedValue([1]);

      const result = await service.updateShiftConfiguration('1', 'prog1', mockData, 'user1');

      expect(result.success).toBe(true);
      expect(shiftTypeConfiguration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          shift_type_time: [{ shift_start_time: '10:00', shift_end_time: '18:00' }],
          time_duration: 8,
        }),
        expect.objectContaining({
          where: {
            shift_config_id: '1',
            shift_type_id: 's1',
          },
        })
      );
    });

    // Negative test cases
    it('should throw error when configuration not found', async () => {
      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);

      const mockData = {
        shift_configuration_name: 'Updated Config',
        id: '1',
        name: 'Updated Config',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      await expect(service.updateShiftConfiguration('1', 'prog1', mockData, 'user1')).rejects.toThrow(
        'Shift configuration not found.'
      );
    });

    it('should throw error when configuration with same name already exists', async () => {
      const mockShiftConfig = {
        id: '1',
        program_id: 'prog1',
        update: jest.fn(),
      };

      const mockData = {
        shift_configuration_name: 'Existing Config Name',
        id: '1',
        name: 'Existing Config Name',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock)
        .mockResolvedValueOnce(mockShiftConfig) // First call for finding the config
        .mockResolvedValueOnce({ id: '2', name: 'Existing Config Name' }); // Second call for checking duplicate name

      await expect(service.updateShiftConfiguration('1', 'prog1', mockData, 'user1')).rejects.toThrow(
        'Shift configuration with the name Existing Config Name already exists.'
      );
    });

    it('should handle database errors during update', async () => {
      const mockShiftConfig = {
        id: '1',
        program_id: 'prog1',
        update: jest.fn().mockRejectedValue(new Error('Database update failed')),
      };

      const mockData = {
        shift_configuration_name: 'Updated Config',
        id: '1',
        name: 'Updated Config',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      (ShiftConfiguration.findOne as jest.Mock)
        .mockResolvedValueOnce(mockShiftConfig)
        .mockResolvedValueOnce(null);

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([]);
      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([]);

      await expect(service.updateShiftConfiguration('1', 'prog1', mockData, 'user1')).rejects.toThrow(
        'Database update failed'
      );
    });

    it('should handle invalid shift configuration ID', async () => {
      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);

      const mockData = {
        shift_configuration_name: 'Updated Config',
        id: 'invalid-id',
        name: 'Updated Config',
        program_id: 'prog1',
        hierarchy_ids: [],
        job_template_ids: [],
        shift_type: [],
        is_enabled: true,
        is_deleted: false,
      };

      await expect(service.updateShiftConfiguration('invalid-id', 'prog1', mockData, 'user1')).rejects.toThrow(
        'Shift configuration not found.'
      );
    });
  });

  describe('deleteShiftConfiguration', () => {
    // Positive test cases
    it('should delete shift configuration successfully', async () => {
      const mockShiftConfig = {
        id: '1',
        name: 'Config to Delete',
        update: jest.fn().mockResolvedValue(true),
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(mockShiftConfig);

      const result = await service.deleteShiftConfiguration('1', 'prog1', 'user1');

      expect(result.found).toBe(true);
      expect(result.success).toBe(true);
      expect(mockShiftConfig.update).toHaveBeenCalledWith({
        is_deleted: true,
        is_enabled: false,
        updated_by: 'user1',
      });
    });

    // Negative test cases
    it('should return not found when configuration does not exist', async () => {
      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.deleteShiftConfiguration('1', 'prog1', 'user1');

      expect(result.found).toBe(false);
      expect(result.success).toBeUndefined();
    });

    it('should handle database errors during deletion', async () => {
      const mockShiftConfig = {
        update: jest.fn().mockRejectedValue(new Error('Database update failed')),
      };

      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(mockShiftConfig);

      await expect(service.deleteShiftConfiguration('1', 'prog1', 'user1')).rejects.toThrow(
        'Database update failed'
      );
    });

    it('should handle invalid parameters', async () => {
      (ShiftConfiguration.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.deleteShiftConfiguration('', '', '');

      expect(result.found).toBe(false);
      expect(ShiftConfiguration.findOne).toHaveBeenCalledWith({
        where: {
          id: '',
          program_id: '',
          is_deleted: false,
        },
      });
    });
  });

  describe('getFilteredShiftConfiguration', () => {
    // Positive test cases
    it('should return filtered shift configurations with pagination', async () => {
      const mockShiftConfigs = [
        { id: '1', name: 'Config 1', toJSON: () => ({ id: '1', name: 'Config 1' }) },
        { id: '2', name: 'Config 2', toJSON: () => ({ id: '2', name: 'Config 2' }) },
      ];

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockShiftConfigs,
      });

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: '1', hierarchy_id: 'h1' },
      ]);

      (hierarchies.findAll as jest.Mock).mockResolvedValue([
        { id: 'h1', name: 'Hierarchy 1' },
      ]);

      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: '1', shift_type_id: 's1' },
      ]);

      (ShiftType.findAll as jest.Mock).mockResolvedValue([
        { id: 's1', shift_type_name: 'Shift Type 1', created_on: new Date() },
      ]);

      const result = await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        page: 1,
        limit: 10,
      });

      expect(result.shiftConfigurations).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total_records).toBe(2);
    });

    it('should filter by name when provided', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        name: 'Test Config',
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({})
          })
        })
      );
    });

    it('should filter by is_enabled when provided', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        is_enabled: true,
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_enabled: true
          })
        })
      );
    });

    it('should filter by updated_on timestamp range when provided', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        updated_on: ['1640995200000', '1672531199000'], // 2022-01-01 to 2022-12-31
      });

      expect(ShiftConfiguration.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updated_on: expect.objectContaining({})
          })
        })
      );
    });

    it('should filter by hierarchy_names when provided', async () => {
      (hierarchies.findAll as jest.Mock).mockResolvedValue([
        { id: 'h1' },
      ]);

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        hierarchy_names: 'Test Hierarchy',
      });

      expect(hierarchies.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({})
          }),
          attributes: ['id']
        })
      );
    });

    it('should filter by shift_type_name when provided', async () => {
      (ShiftType.findAll as jest.Mock).mockResolvedValue([
        { id: 's1' },
      ]);

      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        shift_type_name: 'Day Shift',
      });

      expect(ShiftType.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shift_type_name: expect.objectContaining({})
          }),
          attributes: ['id']
        })
      );
    });

    // Negative test cases
    it('should return empty array when no configurations found', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      const result = await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
      });

      expect(result.shiftConfigurations).toEqual([]);
      expect(result.total_records).toBe(0);
    });

    it('should handle invalid pagination parameters', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      const result = await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        page: -1,
        limit: 0,
      });

      expect(result.page).toBe(-1);
      expect(result.limit).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      (ShiftConfiguration.findAndCountAll as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.getFilteredShiftConfiguration({
        program_id: 'prog1',
      })).rejects.toThrow('Database connection failed');
    });

    it('should handle shift type filtering with existing filtered shift config ids', async () => {
      // First set up hierarchy filtering to populate filteredShiftConfigIds
      (hierarchies.findAll as jest.Mock).mockResolvedValue([
        { id: 'h1' },
      ]);

      (shiftConfigurationHierarchies.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftType.findAll as jest.Mock).mockResolvedValue([
        { id: 's1' },
      ]);

      (shiftTypeConfiguration.findAll as jest.Mock).mockResolvedValue([
        { shift_config_id: 'config1' },
      ]);

      (ShiftConfiguration.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.getFilteredShiftConfiguration({
        program_id: 'prog1',
        hierarchy_names: 'Test Hierarchy',
        shift_type_name: 'Day Shift',
      });

      expect(hierarchies.findAll).toHaveBeenCalled();
      expect(ShiftType.findAll).toHaveBeenCalled();
      expect(shiftTypeConfiguration.findAll).toHaveBeenCalled();
    });
  });
});
