import { RateTypeService } from '../src/service/rate-type.service';
import rateType from '../src/models/rate-type.model';
import { sequelize } from '../src/config/instance';
import { QueryTypes } from 'sequelize';

// Mock all dependencies
jest.mock('../src/models/rate-type.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../src/config/instance', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../src/utility/genrateTraceId', () => ({
  __esModule: true,
  default: () => 'mock-trace-id',
}));

jest.mock('../src/utility/loggerService', () => ({
  logger: jest.fn(),
}));

jest.mock('../src/utility/queries', () => ({
  getAllRateTypes: jest.fn(() => 'mock-query-string'),
  rateTypeShiftAndRate: 'mock-shift-rate-query',
  rateTypeAdvanceFilter: jest.fn(() => 'mock-advance-filter-query'),
}));

const mockRateType = rateType as jest.Mocked<typeof rateType>;
const mockSequelize = sequelize as jest.Mocked<typeof sequelize>;

describe('RateTypeService', () => {
  let service: RateTypeService;
  const mockUser = {
    sub: 'user-123',
    preferred_username: 'testuser',
  };
  const mockProgramId = 'program-123';

  beforeEach(() => {
    service = new RateTypeService();
    jest.clearAllMocks();
  });

  describe('createRateType', () => {
    const mockData = {
      type: 'rate_type',
      id: 'rate-type-123',
      name: 'Test Rate Type',
      is_deleted: false,
      rate: { 
        base_differential_on: 'standard',
        differential_value: 10
      },
      rate_type_category: 'category-1',
    };

    it('should create rate type successfully', async () => {
      mockRateType.findOne.mockResolvedValue(null);
      mockRateType.create.mockResolvedValue({ id: 'rate-type-123' } as any);

      const result = await service.createRateType(
        mockData,
        mockProgramId,
        mockUser,
        'POST',
        '/rate-type'
      );

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(201);
      expect(result.message).toBe('Rate Type created successfully.');
      expect(result.data?.id).toBe('rate-type-123');
      expect(mockRateType.create).toHaveBeenCalledWith({
        ...mockData,
        program_id: mockProgramId,
        created_by: mockUser.sub,
        updated_by: mockUser.sub,
      });
    });

    it('should return error if rate type with same name exists', async () => {
      mockRateType.findOne.mockResolvedValue({ id: 'existing-rate-type' } as any);

      const result = await service.createRateType(
        mockData,
        mockProgramId,
        mockUser,
        'POST',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(400);
      expect(result.message).toBe('A rate type with this name already exists.');
      expect(mockRateType.create).not.toHaveBeenCalled();
    });

    it('should return error if rate type with same base differential exists', async () => {
      mockRateType.findOne
        .mockResolvedValueOnce(null) // First call for name check
        .mockResolvedValueOnce({ id: 'existing-differential' } as any); // Second call for differential check

      const result = await service.createRateType(
        mockData,
        mockProgramId,
        mockUser,
        'POST',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(400);
      expect(result.message).toBe('A rate type with the same category and base differential already exists.');
      expect(mockRateType.create).not.toHaveBeenCalled();
    });

    it('should handle SequelizeUniqueConstraintError', async () => {
      mockRateType.findOne.mockResolvedValue(null);
      const uniqueError = new Error('Unique constraint error');
      uniqueError.name = 'SequelizeUniqueConstraintError';
      (uniqueError as any).errors = [{ path: 'name' }];
      mockRateType.create.mockRejectedValue(uniqueError);

      const result = await service.createRateType(
        mockData,
        mockProgramId,
        mockUser,
        'POST',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(400);
      expect(result.message).toBe('name already in use!');
    });

    it('should handle general errors', async () => {
      mockRateType.findOne.mockResolvedValue(null);
      mockRateType.create.mockRejectedValue(new Error('Database error'));

      const result = await service.createRateType(
        mockData,
        mockProgramId,
        mockUser,
        'POST',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Internal server error');
    });

    it('should create rate type without base differential check when not provided', async () => {
      const dataWithoutDifferential = {
        type: 'rate_type',
        id: 'rate-type-124',
        name: 'Test Rate Type',
        is_deleted: false,
        rate_type_category: 'category-1',
      };
      
      mockRateType.findOne.mockResolvedValue(null);
      mockRateType.create.mockResolvedValue({ id: 'rate-type-123' } as any);

      const result = await service.createRateType(
        dataWithoutDifferential,
        mockProgramId,
        mockUser,
        'POST',
        '/rate-type'
      );

      expect(result.success).toBe(true);
      expect(mockRateType.findOne).toHaveBeenCalledTimes(1); // Only name check
    });
  });

  describe('getAllRateTypes', () => {
    const mockQueryParams = {
      type: 'rate_type',
      id: 'rate-1',
      name: 'test',
      is_deleted: false,
      differential_value: 10,
      page: '1',
      limit: '10',
      is_enabled: true,
    };

    it('should return rate types successfully', async () => {
      const mockRateTypes = [
        { id: '1', name: 'Rate Type 1', total_records: 2 },
        { id: '2', name: 'Rate Type 2', total_records: 2 },
      ];
      
      mockSequelize.query.mockResolvedValue(mockRateTypes as any);

      const result = await service.getAllRateTypes(mockQueryParams, mockProgramId);

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate type fetched successfully.');
      expect(result.data).toEqual(mockRateTypes);
      expect(result.total_records).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return no records message when no rate types found', async () => {
      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.getAllRateTypes(mockQueryParams, mockProgramId);

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.message).toBe('No rate type found for the given program');
      expect(result.data).toEqual([]);
      expect(result.total_records).toBe(0);
    });

    it('should handle errors', async () => {
      mockSequelize.query.mockRejectedValue(new Error('Database error'));

      const result = await service.getAllRateTypes(mockQueryParams, mockProgramId);

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Internal server error');
    });

    it('should handle empty query parameters', async () => {
      const mockRateTypes = [{ id: '1', name: 'Rate Type 1', total_records: 1 }];
      mockSequelize.query.mockResolvedValue(mockRateTypes as any);

      const emptyQueryParams = {
        type: 'rate_type',
        id: '',
        name: '',
        is_deleted: false,
        differential_value: 0,
      };

      const result = await service.getAllRateTypes(emptyQueryParams, mockProgramId);

      expect(result.success).toBe(true);
      expect(result.page).toBe(1); // Default page
      expect(result.limit).toBe(10); // Default limit
    });
  });

  describe('updateRateTypeById', () => {
    const mockId = 'rate-type-123';
    const mockUpdates = {
      type: 'rate_type',
      id: mockId,
      name: 'Updated Rate Type',
      is_deleted: false,
      rate_type_category: 'new-category',
    };

    it('should update rate type successfully', async () => {
      mockRateType.findOne
        .mockResolvedValueOnce({ id: mockId } as any) // Rate type exists
        .mockResolvedValueOnce(null); // No duplicate name
      mockRateType.update.mockResolvedValue([1]);

      const result = await service.updateRateTypeById(
        mockId,
        mockProgramId,
        mockUpdates,
        mockUser,
        'PUT',
        '/rate-type'
      );

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate type updated successfully');
      expect(mockRateType.update).toHaveBeenCalledWith(
        {
          ...mockUpdates,
          updated_on: expect.any(Number),
          updated_by: mockUser.sub,
        },
        { where: { id: mockId, program_id: mockProgramId } }
      );
    });

    it('should return 404 if rate type not found', async () => {
      mockRateType.findOne.mockResolvedValue(null);

      const result = await service.updateRateTypeById(
        mockId,
        mockProgramId,
        mockUpdates,
        mockUser,
        'PUT',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(404);
      expect(result.message).toBe('Rate type not found');
      expect(mockRateType.update).not.toHaveBeenCalled();
    });

    it('should return error if name already exists', async () => {
      mockRateType.findOne
        .mockResolvedValueOnce({ id: mockId } as any) // Rate type exists
        .mockResolvedValueOnce({ id: 'other-id' } as any); // Duplicate name exists

      const result = await service.updateRateTypeById(
        mockId,
        mockProgramId,
        mockUpdates,
        mockUser,
        'PUT',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(400);
      expect(result.message).toBe('A rate type with this name already exists.');
      expect(mockRateType.update).not.toHaveBeenCalled();
    });

    it('should handle SequelizeUniqueConstraintError', async () => {
      // Use updates without name to avoid name validation
      const updatesWithoutName = {
        type: 'rate_type',
        id: mockId,
        name: '', // Empty name to skip validation
        is_deleted: false,
        rate_type_category: 'new-category',
        abbreviation: 'TST'
      };

      mockRateType.findOne.mockResolvedValue({ id: mockId } as any); // Rate type exists

      // Mock the update operation to throw SequelizeUniqueConstraintError
      const uniqueError = new Error('Unique constraint error');
      uniqueError.name = 'SequelizeUniqueConstraintError';
      (uniqueError as any).errors = [{ path: 'abbreviation' }];
      mockRateType.update.mockRejectedValue(uniqueError);

      const result = await service.updateRateTypeById(
        mockId,
        mockProgramId,
        updatesWithoutName,
        mockUser,
        'PUT',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(400);
      expect(result.message).toBe('abbreviation already in use!');
    });

    it('should handle general errors', async () => {
      // Use updates without name to avoid name validation
      const updatesWithoutName = {
        type: 'rate_type',
        id: mockId,
        name: '', // Empty name to skip validation
        is_deleted: false,
        rate_type_category: 'new-category',
      };

      mockRateType.findOne.mockResolvedValue({ id: mockId } as any); // Rate type exists

      // Mock the update operation to throw a general error
      const generalError = new Error('Database connection error');
      generalError.name = 'DatabaseError';
      mockRateType.update.mockRejectedValue(generalError);

      const result = await service.updateRateTypeById(
        mockId,
        mockProgramId,
        updatesWithoutName,
        mockUser,
        'PUT',
        '/rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Internal server error');
    });
  });

  describe('getDifferentialOnForRateType', () => {
    it('should return differential data successfully with both standard and shift', async () => {
      const mockRateTypes = [
        { id: '1', name: 'Standard Rate', is_base_rate: true, is_shift_rate: false },
        { id: '2', name: 'Shift Rate 1', is_base_rate: true, is_shift_rate: true },
        { id: '3', name: 'Shift Rate 2', is_base_rate: true, is_shift_rate: true },
        { id: '4', name: 'Non-base Rate', is_base_rate: false, is_shift_rate: false },
      ];

      mockRateType.findAll.mockResolvedValue(mockRateTypes as any);

      const result = await service.getDifferentialOnForRateType(
        mockProgramId,
        undefined,
        mockUser,
        'GET',
        '/differential-on'
      );

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate type get successfully');
      expect(result.data).toEqual({
        standard: { id: '1', name: 'Standard Rate' },
        shift: [
          { id: '2', name: 'Shift Rate 1' },
          { id: '3', name: 'Shift Rate 2' },
        ],
      });
    });

    it('should return only standard when is_shift_rate is false', async () => {
      const mockRateTypes = [
        { id: '1', name: 'Standard Rate', is_base_rate: true, is_shift_rate: false },
        { id: '2', name: 'Shift Rate', is_base_rate: true, is_shift_rate: true },
      ];

      mockRateType.findAll.mockResolvedValue(mockRateTypes as any);

      const result = await service.getDifferentialOnForRateType(
        mockProgramId,
        'false',
        mockUser,
        'GET',
        '/differential-on'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        standard: { id: '1', name: 'Standard Rate' },
      });
    });

    it('should return null standard when no standard rate type exists', async () => {
      const mockRateTypes = [
        { id: '1', name: 'Shift Rate', is_base_rate: true, is_shift_rate: true },
        { id: '2', name: 'Non-base Rate', is_base_rate: false, is_shift_rate: false },
      ];

      mockRateType.findAll.mockResolvedValue(mockRateTypes as any);

      const result = await service.getDifferentialOnForRateType(
        mockProgramId,
        undefined,
        mockUser,
        'GET',
        '/differential-on'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        standard: null,
        shift: [{ id: '1', name: 'Shift Rate' }],
      });
    });

    it('should return empty shift array when no shift rate types exist', async () => {
      const mockRateTypes = [
        { id: '1', name: 'Standard Rate', is_base_rate: true, is_shift_rate: false },
        { id: '2', name: 'Non-base Rate', is_base_rate: false, is_shift_rate: false },
      ];

      mockRateType.findAll.mockResolvedValue(mockRateTypes as any);

      const result = await service.getDifferentialOnForRateType(
        mockProgramId,
        undefined,
        mockUser,
        'GET',
        '/differential-on'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        standard: { id: '1', name: 'Standard Rate' },
        shift: [],
      });
    });

    it('should work without user context', async () => {
      const mockRateTypes = [
        { id: '1', name: 'Standard Rate', is_base_rate: true, is_shift_rate: false },
      ];

      mockRateType.findAll.mockResolvedValue(mockRateTypes as any);

      const result = await service.getDifferentialOnForRateType(mockProgramId);

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
    });

    it('should filter correctly with proper where conditions', async () => {
      mockRateType.findAll.mockResolvedValue([]);

      await service.getDifferentialOnForRateType(mockProgramId);

      expect(mockRateType.findAll).toHaveBeenCalledWith({
        where: {
          program_id: mockProgramId,
          is_enabled: true,
          is_deleted: false,
        },
        attributes: ['id', 'name', 'is_base_rate', 'is_shift_rate'],
      });
    });

    it('should handle empty result set', async () => {
      mockRateType.findAll.mockResolvedValue([]);

      const result = await service.getDifferentialOnForRateType(
        mockProgramId,
        undefined,
        mockUser,
        'GET',
        '/differential-on'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        standard: null,
        shift: [],
      });
    });

    it('should handle multiple standard rate types (should return last one)', async () => {
      const mockRateTypes = [
        { id: '1', name: 'Standard Rate 1', is_base_rate: true, is_shift_rate: false },
        { id: '2', name: 'Standard Rate 2', is_base_rate: true, is_shift_rate: false },
      ];

      mockRateType.findAll.mockResolvedValue(mockRateTypes as any);

      const result = await service.getDifferentialOnForRateType(mockProgramId);

      expect(result.success).toBe(true);
      // The service uses forEach which overwrites the standard variable, so last one wins
      expect(result.data.standard).toEqual({ id: '2', name: 'Standard Rate 2' });
    });

    it('should handle database errors', async () => {
      mockRateType.findAll.mockRejectedValue(new Error('Database error'));

      const result = await service.getDifferentialOnForRateType(
        mockProgramId,
        undefined,
        mockUser,
        'GET',
        '/differential-on'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Failed to retrieve rate type');
    });
  });

  describe('getShiftAndRateType', () => {
    it('should return shift and rate type data successfully', async () => {
      const mockQueryResults = [
        { shift_id: '1', shift_name: 'Day Shift', rate_type_id: '10', rate_type_value: 'Regular' },
        { shift_id: '2', shift_name: 'Night Shift', rate_type_id: '11', rate_type_value: 'Overtime' },
        { shift_id: null, shift_name: null, rate_type_id: '12', rate_type_value: 'Holiday' },
        { shift_id: '3', shift_name: 'Weekend Shift', rate_type_id: null, rate_type_value: null },
      ];

      mockSequelize.query.mockResolvedValue(mockQueryResults as any);

      const result = await service.getShiftAndRateType(
        mockProgramId,
        mockUser,
        'GET',
        '/shift-rate-type'
      );

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Shift and rate type data retrieved successfully');
      expect(result.data).toEqual({
        shift_type: [
          { id: '1', name: 'Day Shift' },
          { id: '2', name: 'Night Shift' },
          { id: '3', name: 'Weekend Shift' },
        ],
        rate_type_category: [
          { id: '10', name: 'Regular' },
          { id: '11', name: 'Overtime' },
          { id: '12', name: 'Holiday' },
        ],
      });
    });

    it('should return empty arrays when no data found', async () => {
      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.getShiftAndRateType(mockProgramId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        shift_type: [],
        rate_type_category: [],
      });
    });

    it('should filter out null/undefined values correctly', async () => {
      const mockQueryResults = [
        { shift_id: null, shift_name: null, rate_type_id: null, rate_type_value: null },
        { shift_id: '', shift_name: '', rate_type_id: '', rate_type_value: '' },
        { shift_id: undefined, shift_name: undefined, rate_type_id: undefined, rate_type_value: undefined },
      ];

      mockSequelize.query.mockResolvedValue(mockQueryResults as any);

      const result = await service.getShiftAndRateType(mockProgramId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        shift_type: [],
        rate_type_category: [],
      });
    });

    it('should work without user context', async () => {
      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.getShiftAndRateType(mockProgramId);

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
    });

    it('should call sequelize.query with correct parameters', async () => {
      mockSequelize.query.mockResolvedValue([] as any);

      await service.getShiftAndRateType(mockProgramId);

      expect(mockSequelize.query).toHaveBeenCalledWith(
        'mock-shift-rate-query',
        {
          replacements: { program_id: mockProgramId },
          type: QueryTypes.SELECT,
        }
      );
    });

    it('should handle partial data correctly', async () => {
      const mockQueryResults = [
        { shift_id: '1', shift_name: 'Day Shift', rate_type_id: null, rate_type_value: null },
        { shift_id: null, shift_name: null, rate_type_id: '10', rate_type_value: 'Regular' },
      ];

      mockSequelize.query.mockResolvedValue(mockQueryResults as any);

      const result = await service.getShiftAndRateType(mockProgramId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        shift_type: [{ id: '1', name: 'Day Shift' }],
        rate_type_category: [{ id: '10', name: 'Regular' }],
      });
    });

    it('should handle duplicate entries correctly', async () => {
      const mockQueryResults = [
        { shift_id: '1', shift_name: 'Day Shift', rate_type_id: '10', rate_type_value: 'Regular' },
        { shift_id: '1', shift_name: 'Day Shift', rate_type_id: '11', rate_type_value: 'Overtime' },
        { shift_id: '2', shift_name: 'Night Shift', rate_type_id: '10', rate_type_value: 'Regular' },
      ];

      mockSequelize.query.mockResolvedValue(mockQueryResults as any);

      const result = await service.getShiftAndRateType(mockProgramId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        shift_type: [
          { id: '1', name: 'Day Shift' },
          { id: '1', name: 'Day Shift' }, // Duplicates are preserved as they come from query
          { id: '2', name: 'Night Shift' },
        ],
        rate_type_category: [
          { id: '10', name: 'Regular' },
          { id: '11', name: 'Overtime' },
          { id: '10', name: 'Regular' }, // Duplicates are preserved
        ],
      });
    });

    it('should handle database errors', async () => {
      mockSequelize.query.mockRejectedValue(new Error('Database error'));

      const result = await service.getShiftAndRateType(
        mockProgramId,
        mockUser,
        'GET',
        '/shift-rate-type'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Failed to retrieve shift and rate type data');
    });

    it('should handle connection timeout errors', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'SequelizeConnectionTimeoutError';
      mockSequelize.query.mockRejectedValue(timeoutError);

      const result = await service.getShiftAndRateType(mockProgramId, mockUser);

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Failed to retrieve shift and rate type data');
    });
  });

  describe('rateTypeFilter', () => {
    const mockFilterData = {
      id: 'rate-1',
      name: 'test',
      rate_type_category: 'category-1',
      abbreviation: 'TST',
      is_enabled: 'true' as any,
      is_base_rate: true as any,
      updated_on: [1640995200000, 1641081600000],
      page: '2',
      limit: '20',
    };

    it('should filter rate types successfully', async () => {
      const mockResults = [
        { id: '1', name: 'Test Rate Type', total_count: 1 },
      ];

      mockSequelize.query.mockResolvedValue(mockResults as any);

      const result = await service.rateTypeFilter(
        mockProgramId,
        mockFilterData,
        mockUser,
        'POST',
        '/rate-type/filter'
      );

      expect(result.success).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.message).toBe('Rate Types fetched successfully.');
      expect(result.data).toEqual(mockResults);
      expect(result.total_records).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should return no records message when no data found', async () => {
      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.rateTypeFilter(
        mockProgramId,
        mockFilterData,
        mockUser,
        'POST',
        '/rate-type/filter'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('No records found.');
      expect(result.total_records).toBe(0);
    });

    it('should handle boolean string conversions correctly', async () => {
      const filterWithBooleanStrings = {
        is_enabled: 'false',
        is_base_rate: 'true',
        page: '1',
        limit: '10',
      };

      mockSequelize.query.mockResolvedValue([] as any);

      await service.rateTypeFilter(mockProgramId, filterWithBooleanStrings);

      expect(mockSequelize.query).toHaveBeenCalled();
    });

    it('should handle boolean values correctly', async () => {
      const filterWithBooleans = {
        is_enabled: false,
        is_base_rate: true,
        page: '1',
        limit: '10',
      };

      mockSequelize.query.mockResolvedValue([] as any);

      await service.rateTypeFilter(mockProgramId, filterWithBooleans);

      expect(mockSequelize.query).toHaveBeenCalled();
    });

    it('should use default pagination when not provided', async () => {
      const filterWithoutPagination = {
        name: 'test',
      };

      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.rateTypeFilter(mockProgramId, filterWithoutPagination);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should work without user context', async () => {
      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.rateTypeFilter(mockProgramId, mockFilterData);

      expect(result.success).toBe(true);
    });

    it('should handle date range filter correctly', async () => {
      const filterWithDateRange = {
        updated_on: [1640995200000, 1641081600000],
        page: '1',
        limit: '10',
      };

      mockSequelize.query.mockResolvedValue([] as any);

      await service.rateTypeFilter(mockProgramId, filterWithDateRange);

      expect(mockSequelize.query).toHaveBeenCalled();
    });

    it('should handle invalid date range', async () => {
      const filterWithInvalidDateRange = {
        updated_on: ['invalid'],
        page: '1',
        limit: '10',
      };

      mockSequelize.query.mockResolvedValue([] as any);

      await service.rateTypeFilter(mockProgramId, filterWithInvalidDateRange);

      expect(mockSequelize.query).toHaveBeenCalled();
    });

    it('should handle empty filter data', async () => {
      const emptyFilter = {};

      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.rateTypeFilter(mockProgramId, emptyFilter);

      expect(result.success).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle special characters in filter values', async () => {
      const filterWithSpecialChars = {
        name: 'test@#$%^&*()',
        abbreviation: 'T$T',
        rate_type_category: 'cat-1!@#',
      };

      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.rateTypeFilter(mockProgramId, filterWithSpecialChars);

      expect(result.success).toBe(true);
    });

    it('should handle very large result sets', async () => {
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        id: `rate-${i}`,
        name: `Rate Type ${i}`,
        total_count: 1000,
      }));

      mockSequelize.query.mockResolvedValue(largeResults as any);

      const result = await service.rateTypeFilter(mockProgramId, mockFilterData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
      expect(result.total_records).toBe(1000);
    });

    it('should handle zero and negative pagination values', async () => {
      const filterWithZeroPagination = {
        page: '0',
        limit: '0',
      };

      mockSequelize.query.mockResolvedValue([] as any);

      const result = await service.rateTypeFilter(mockProgramId, filterWithZeroPagination);

      expect(result.success).toBe(true);
      expect(result.page).toBe(0);
      expect(result.limit).toBe(0);
    });

    it('should handle database errors', async () => {
      mockSequelize.query.mockRejectedValue(new Error('Database error'));

      const result = await service.rateTypeFilter(
        mockProgramId,
        mockFilterData,
        mockUser,
        'POST',
        '/rate-type/filter'
      );

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Internal Server Error');
    });

    it('should handle connection timeout errors', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'SequelizeConnectionTimeoutError';
      mockSequelize.query.mockRejectedValue(timeoutError);

      const result = await service.rateTypeFilter(mockProgramId, mockFilterData, mockUser);

      expect(result.success).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.message).toBe('Internal Server Error');
    });
  });

  describe('Helper Methods', () => {
    describe('parseBoolean', () => {
      it('should parse string "true" to 1', () => {
        const result = (service as any).parseBoolean('true');
        expect(result).toBe(1);
      });

      it('should parse string "false" to 0', () => {
        const result = (service as any).parseBoolean('false');
        expect(result).toBe(0);
      });

      it('should parse boolean true to 1', () => {
        const result = (service as any).parseBoolean(true);
        expect(result).toBe(1);
      });

      it('should parse boolean false to 0', () => {
        const result = (service as any).parseBoolean(false);
        expect(result).toBe(0);
      });

      it('should return undefined for invalid string', () => {
        const result = (service as any).parseBoolean('invalid');
        expect(result).toBeUndefined();
      });

      it('should return undefined for null', () => {
        const result = (service as any).parseBoolean(null);
        expect(result).toBeUndefined();
      });

      it('should return undefined for undefined', () => {
        const result = (service as any).parseBoolean(undefined);
        expect(result).toBeUndefined();
      });

      it('should return undefined for number', () => {
        const result = (service as any).parseBoolean(123);
        expect(result).toBeUndefined();
      });

      it('should return undefined for object', () => {
        const result = (service as any).parseBoolean({});
        expect(result).toBeUndefined();
      });
    });

    describe('parseDateRange', () => {
      it('should parse date range correctly', () => {
        const result = (service as any).parseDateRange('1640995200000,1641081600000');
        expect(result.startDate).toBeDefined();
        expect(result.endDate).toBeDefined();
      });

      it('should return empty object for empty string', () => {
        const result = (service as any).parseDateRange('');
        expect(result).toEqual({});
      });

      it('should return empty object for null', () => {
        const result = (service as any).parseDateRange(null);
        expect(result).toEqual({});
      });

      it('should return empty object for undefined', () => {
        const result = (service as any).parseDateRange(undefined);
        expect(result).toEqual({});
      });

      it('should handle single date', () => {
        const result = (service as any).parseDateRange('1640995200000');
        expect(result.startDate).toBeDefined();
        expect(result.endDate).toBeDefined();
      });

      it('should handle invalid date format', () => {
        const result = (service as any).parseDateRange('invalid-date');
        // When invalid date is passed, new Date(Number('invalid-date')) creates invalid date
        // and getTime() returns NaN, which gets included in the result
        expect(result).toEqual({ startDate: NaN });
      });
    });

    describe('getQueryParams', () => {
      it('should process query parameters correctly', () => {
        const query = {
          id: 'test-id',
          name: 'test-name',
          is_enabled: 'true',
          page: '2',
          limit: '20',
          hierarchy_ids: 'id1,id2,id3',
          rate_type_category_label: 'label1,label2',
        };

        const result = (service as any).getQueryParams(query);

        expect(result.id).toBe('test-id');
        expect(result.name).toBe('test-name');
        expect(result.hasName).toBe(true);
        expect(result.hasId).toBe(true);
        expect(result.isEnabledValue).toBe(1);
        expect(result.pageNumber).toBe(2);
        expect(result.pageSize).toBe(20);
        expect(result.offset).toBe(20);
        expect(result.hierarchyIdsArray).toEqual(['id1', 'id2', 'id3']);
        expect(result.rateTypeCategoryLabels).toEqual(['label1', 'label2']);
      });

      it('should use default values when parameters not provided', () => {
        const result = (service as any).getQueryParams({});

        expect(result.pageNumber).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(result.offset).toBe(0);
        expect(result.hasName).toBe(false);
        expect(result.hasId).toBe(false);
        expect(result.hierarchyIdsArray).toEqual([]);
        expect(result.rateTypeCategoryLabels).toEqual([]);
      });

      it('should handle boolean parameters correctly', () => {
        const query = {
          is_enabled: false,
          is_base_rate: true,
          is_shift_rate: 'false',
        };

        const result = (service as any).getQueryParams(query);

        expect(result.isEnabledValue).toBe(0);
        expect(result.isBaseRate).toBe(1);
        expect(result.isShiftRateValue).toBe(0);
      });

      it('should handle edge case pagination values', () => {
        const query = {
          page: '0',
          limit: '0',
        };

        const result = (service as any).getQueryParams(query);

        expect(result.pageNumber).toBe(0);
        expect(result.pageSize).toBe(0);
        // (0-1) * 0 = -0 (negative zero), which is different from 0 in Object.is comparison
        expect(result.offset).toBe(-0);
      });

      it('should handle invalid pagination values', () => {
        const query = {
          page: 'invalid',
          limit: 'invalid',
        };

        const result = (service as any).getQueryParams(query);

        expect(result.pageNumber).toBe(NaN);
        expect(result.pageSize).toBe(NaN);
        expect(result.offset).toBe(NaN);
      });

      it('should handle empty string arrays', () => {
        const query = {
          hierarchy_ids: '',
          rate_type_category_label: '',
        };

        const result = (service as any).getQueryParams(query);

        // Empty string is falsy, so the ternary condition returns []
        // hierarchy_ids ? hierarchy_ids.split(",") : [] -> '' ? ''.split(",") : [] -> []
        expect(result.hierarchyIdsArray).toEqual([]);
        expect(result.rateTypeCategoryLabels).toEqual([]);
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    describe('createRateType edge cases', () => {
      it('should handle empty program_id', async () => {
        const mockData = {
          type: 'rate_type',
          id: 'rate-type-123',
          name: 'Test Rate Type',
          is_deleted: false,
          rate_type_category: 'category-1',
        };

        mockRateType.findOne.mockResolvedValue(null);
        mockRateType.create.mockResolvedValue({ id: 'rate-type-123' } as any);

        const result = await service.createRateType(
          mockData,
          '',
          mockUser,
          'POST',
          '/rate-type'
        );

        expect(result.trace_id).toBe('mock-trace-id');
        expect(result.success).toBe(true);
      });

      it('should handle missing user information', async () => {
        const mockData = {
          type: 'rate_type',
          id: 'rate-type-123',
          name: 'Test Rate Type',
          is_deleted: false,
          rate_type_category: 'category-1',
        };

        const userWithoutUsername = { sub: 'user-123' };

        mockRateType.findOne.mockResolvedValue(null);
        mockRateType.create.mockResolvedValue({ id: 'rate-type-123' } as any);

        const result = await service.createRateType(
          mockData,
          mockProgramId,
          userWithoutUsername,
          'POST',
          '/rate-type'
        );

        expect(result.success).toBe(true);
      });

      it('should handle rate type with complex differential data', async () => {
        const mockData = {
          type: 'rate_type',
          id: 'rate-type-123',
          name: 'Complex Rate Type',
          is_deleted: false,
          rate: {
            base_differential_on: 'shift',
            differential_value: 15.5,
            multiplier: 1.5
          },
          rate_type_category: 'category-1',
        };

        mockRateType.findOne.mockResolvedValue(null);
        mockRateType.create.mockResolvedValue({ id: 'rate-type-123' } as any);

        const result = await service.createRateType(
          mockData,
          mockProgramId,
          mockUser,
          'POST',
          '/rate-type'
        );

        expect(result.success).toBe(true);
        expect(mockRateType.findOne).toHaveBeenCalledTimes(2); // Name and differential checks
      });
    });

    describe('getAllRateTypes edge cases', () => {
      it('should handle very large pagination values', async () => {
        const queryWithLargePagination = {
          type: 'rate_type',
          id: '',
          name: '',
          is_deleted: false,
          differential_value: 0,
          page: '999999',
          limit: '999999',
        };

        mockSequelize.query.mockResolvedValue([] as any);

        const result = await service.getAllRateTypes(queryWithLargePagination, mockProgramId);

        expect(result.success).toBe(true);
        expect(result.page).toBe(999999);
        expect(result.limit).toBe(999999);
      });

      it('should handle negative pagination values', async () => {
        const queryWithNegativePagination = {
          type: 'rate_type',
          id: '',
          name: '',
          is_deleted: false,
          differential_value: 0,
          page: '-1',
          limit: '-10',
        };

        mockSequelize.query.mockResolvedValue([] as any);

        const result = await service.getAllRateTypes(queryWithNegativePagination, mockProgramId);

        expect(result.success).toBe(true);
        expect(result.page).toBe(-1);
        expect(result.limit).toBe(-10);
      });

      it('should handle special characters in search parameters', async () => {
        const queryWithSpecialChars = {
          type: 'rate_type',
          id: 'test@#$%',
          name: 'test with spaces & symbols!',
          is_deleted: false,
          differential_value: 0,
        };

        mockSequelize.query.mockResolvedValue([] as any);

        const result = await service.getAllRateTypes(queryWithSpecialChars, mockProgramId);

        expect(result.success).toBe(true);
      });
    });

    describe('updateRateTypeById edge cases', () => {
      const mockId = 'rate-type-123';

      it('should handle update with minimal data', async () => {
        const minimalUpdates = {
          type: 'rate_type',
          id: mockId,
          name: '',
          is_deleted: false,
        };

        mockRateType.findOne.mockResolvedValue({ id: mockId } as any);
        mockRateType.update.mockResolvedValue([1]);

        const result = await service.updateRateTypeById(
          mockId,
          mockProgramId,
          minimalUpdates,
          mockUser,
          'PUT',
          '/rate-type'
        );

        expect(result.success).toBe(true);
      });

      it('should handle update with same name (no change)', async () => {
        const sameNameUpdates = {
          type: 'rate_type',
          id: mockId,
          name: 'Existing Name',
          is_deleted: false,
          rate_type_category: 'new-category',
        };

        mockRateType.findOne
          .mockResolvedValueOnce({ id: mockId, name: 'Existing Name' } as any) // Rate type exists
          .mockResolvedValueOnce({ id: mockId, name: 'Existing Name' } as any); // Same name found (same record)
        mockRateType.update.mockResolvedValue([1]);

        const result = await service.updateRateTypeById(
          mockId,
          mockProgramId,
          sameNameUpdates,
          mockUser,
          'PUT',
          '/rate-type'
        );

        // This should still fail because the service finds a record with the same name
        expect(result.success).toBe(false);
        expect(result.status_code).toBe(400);
      });

      it('should handle database timeout error', async () => {
        const updates = {
          type: 'rate_type',
          id: mockId,
          name: '',
          is_deleted: false,
          rate_type_category: 'new-category',
        };

        mockRateType.findOne.mockResolvedValue({ id: mockId } as any);
        const timeoutError = new Error('Connection timeout');
        timeoutError.name = 'SequelizeConnectionError';
        mockRateType.update.mockRejectedValue(timeoutError);

        const result = await service.updateRateTypeById(
          mockId,
          mockProgramId,
          updates,
          mockUser,
          'PUT',
          '/rate-type'
        );

        expect(result.success).toBe(false);
        expect(result.status_code).toBe(500);
        expect(result.message).toBe('Internal server error');
      });
    });
  });
});
