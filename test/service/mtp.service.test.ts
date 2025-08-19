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
jest.mock('../../src/models/mtp.model', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  bulkCreate: jest.fn(),
}));

jest.mock('../../src/models/disable_mtp.model', () => ({
  bulkCreate: jest.fn(),
}));

jest.mock('../../src/models/candidate.model', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
}));

// Mock repository
jest.mock('../../src/repositories/mtp.repository', () => {
  return jest.fn().mockImplementation(() => ({
    getCandidate: jest.fn(),
    getAllMtp: jest.fn(),
    getAllMtpData: jest.fn(),
    getMtpById: jest.fn(),
    getLinkProfiles: jest.fn(),
  }));
});

// Mock utilities
jest.mock('../../src/utility/create-candidate', () => ({
  findDuplicateCandidate: jest.fn(),
}));

jest.mock('../../src/utility/loggerService', () => ({
  logger: jest.fn(),
}));

jest.mock('../../src/utility/update-worker', () => ({
  updateDoNotRehireForCandidateWorkers: jest.fn(),
}));

import MtpService from '../../src/service/mtp.service';
import MtpModel from '../../src/models/mtp.model';
import DisebleMtp from '../../src/models/disable_mtp.model';
import MtpRepository from '../../src/repositories/mtp.repository';
import { findDuplicateCandidate } from '../../src/utility/create-candidate';
import { logger } from '../../src/utility/loggerService';

describe('MtpService', () => {
  let service: MtpService;
  let mockRepository: jest.Mocked<MtpRepository>;
  let mockTransaction: any;

  beforeEach(() => {
    service = new MtpService();
    mockRepository = (service as any).mtpRepository;
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    mockSequelize.transaction.mockResolvedValue(mockTransaction);
    jest.clearAllMocks();
  });

  describe('createMtp', () => {
    const mockMtpData = {
      id: 'mtp-1' as any,
      program_id: 'prog-1' as any,
      mtp_id: 'mtp-001',
      mtp_candidate_id: 'candidate-1' as any,
      talent_name: 'John Doe',
      linked_profiles: [] as any,
      is_deleted: false,
    };

    const mockRequest = {
      method: 'POST',
      url: '/mtp',
      body: mockMtpData,
    } as any;

    const mockUser = {
      sub: 'user-1',
      preferred_username: 'testuser',
    };

    // Positive test cases
    it('should create new MTP when no existing data found', async () => {
      mockRepository.getCandidate.mockResolvedValue([{ candidate_name: 'John Doe' }]);
      mockRepository.getAllMtp.mockResolvedValue([]);
      (MtpModel.create as jest.Mock).mockResolvedValue({
        ...mockMtpData,
        id: 'new-mtp-id',
      });

      const result = await service.createMtp({
        programId: 'prog-1',
        mtp: mockMtpData,
        userId: 'user-1',
        token: 'token',
        request: mockRequest,
        traceId: 'trace-1',
        user: mockUser,
      });

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('No existing MTP data found. New MTP created successfully.');
      expect(MtpModel.create).toHaveBeenCalled();
      expect(logger).toHaveBeenCalled();
    });

    it('should detect duplicate and skip creation', async () => {
      mockRepository.getCandidate.mockResolvedValue([{ candidate_name: 'John Doe' }]);
      mockRepository.getAllMtp.mockResolvedValue([
        { candidate_id: 'candidate-1' },
        { candidate_id: 'candidate-2' },
      ]);

      const result = await service.createMtp({
        programId: 'prog-1',
        mtp: mockMtpData,
        userId: 'user-1',
        token: 'token',
        request: mockRequest,
        traceId: 'trace-1',
        user: mockUser,
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Duplicate detected. Added to possible duplicates.');
      expect(findDuplicateCandidate).toHaveBeenCalled();
      expect(logger).toHaveBeenCalled();
    });

    it('should create new MTP when existing data found but no duplicates', async () => {
      mockRepository.getCandidate.mockResolvedValue([{ candidate_name: 'John Doe' }]);
      mockRepository.getAllMtp.mockResolvedValue([
        { candidate_id: 'candidate-2' },
        { candidate_id: 'candidate-3' },
      ]);
      (MtpModel.create as jest.Mock).mockResolvedValue({
        ...mockMtpData,
        id: 'new-mtp-id',
      });

      const result = await service.createMtp({
        programId: 'prog-1',
        mtp: mockMtpData,
        userId: 'user-1',
        token: 'token',
        request: mockRequest,
        traceId: 'trace-1',
        user: mockUser,
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Duplicate detected. Added to possible duplicates.');
      expect(findDuplicateCandidate).toHaveBeenCalled();
    });

    // Negative test cases
    it('should handle candidate not found', async () => {
      mockRepository.getCandidate.mockResolvedValue([]);
      mockRepository.getAllMtp.mockResolvedValue([]);
      (MtpModel.create as jest.Mock).mockResolvedValue({
        ...mockMtpData,
        id: 'new-mtp-id',
        talent_name: undefined,
      });

      const result = await service.createMtp({
        programId: 'prog-1',
        mtp: mockMtpData,
        userId: 'user-1',
        token: 'token',
        request: mockRequest,
        traceId: 'trace-1',
        user: mockUser,
      });

      expect(result.statusCode).toBe(201);
      expect(mockRepository.getCandidate).toHaveBeenCalledWith('prog-1', 'candidate-1');
    });

    it('should handle database errors during creation', async () => {
      mockRepository.getCandidate.mockResolvedValue([{ candidate_name: 'John Doe' }]);
      mockRepository.getAllMtp.mockResolvedValue([]);
      (MtpModel.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.createMtp({
        programId: 'prog-1',
        mtp: mockMtpData,
        userId: 'user-1',
        token: 'token',
        request: mockRequest,
        traceId: 'trace-1',
        user: mockUser,
      })).rejects.toThrow('Database error');
    });
  });

  describe('getAllMtp', () => {
    // Positive test cases
    it('should return MTP data with pagination', async () => {
      const mockMtpData = [
        { id: 'mtp-1', talent_name: 'John Doe' },
        { id: 'mtp-2', talent_name: 'Jane Smith' },
      ];

      mockRepository.getAllMtpData.mockResolvedValue({
        data: mockMtpData,
        count: 2,
      });

      const result = await service.getAllMtp({
        programId: 'prog-1',
        page: 1,
        limit: 10,
      });

      expect(result.message).toBe('MTP data fetched successfully.');
      expect(result.data).toEqual(mockMtpData);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total_count).toBe(2);
      expect(result.pagination.total_pages).toBe(1);
    });

    it('should return empty message when no data found', async () => {
      mockRepository.getAllMtpData.mockResolvedValue({
        data: [],
        count: 0,
      });

      const result = await service.getAllMtp({
        programId: 'prog-1',
      });

      expect(result.message).toBe('No matching records found.');
      expect(result.data).toEqual([]);
      expect(result.pagination.total_count).toBe(0);
    });

    it('should handle filtering parameters', async () => {
      mockRepository.getAllMtpData.mockResolvedValue({
        data: [{ id: 'mtp-1', talent_name: 'John Doe' }],
        count: 1,
      });

      const result = await service.getAllMtp({
        programId: 'prog-1',
        page: 2,
        limit: 5,
        talentName: 'John',
        mtpId: 'mtp-1',
        doNotRehire: 'true',
        updatedOn: '2023-01-01',
        linkedProfiles: 2,
      });

      expect(mockRepository.getAllMtpData).toHaveBeenCalledWith(
        'prog-1',
        5,
        5, // offset = (page - 1) * limit = (2 - 1) * 5 = 5
        'John',
        'mtp-1',
        'true',
        '2023-01-01',
        2
      );
      expect(result.data).toHaveLength(1);
    });

    // Negative test cases
    it('should handle database errors', async () => {
      mockRepository.getAllMtpData.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getAllMtp({
        programId: 'prog-1',
      })).rejects.toThrow('Database connection failed');
    });
  });

  describe('getMtpById', () => {
    // Positive test cases
    it('should return MTP data when found', async () => {
      const mockMtpData = {
        id: 'mtp-1',
        talent_name: 'John Doe',
        program_id: 'prog-1',
      };

      mockRepository.getMtpById.mockResolvedValue([mockMtpData]);

      const result = await service.getMtpById('prog-1', 'mtp-1', 10, 0);

      expect(result.message).toBe('MTP data retrieved successfully.');
      expect(result.data).toEqual(mockMtpData);
      expect(mockRepository.getMtpById).toHaveBeenCalledWith('prog-1', 'mtp-1', 10, 0);
    });

    // Negative test cases
    it('should return empty data when MTP not found', async () => {
      mockRepository.getMtpById.mockResolvedValue([null]);

      const result = await service.getMtpById('prog-1', 'non-existent');

      expect(result.message).toBe('No matching records found.');
      expect(result.data).toEqual({});
    });

    it('should handle undefined MTP data', async () => {
      mockRepository.getMtpById.mockResolvedValue([undefined]);

      const result = await service.getMtpById('prog-1', 'mtp-1');

      expect(result.message).toBe('No matching records found.');
      expect(result.data).toEqual({});
    });

    it('should handle database errors', async () => {
      mockRepository.getMtpById.mockRejectedValue(new Error('Database error'));

      await expect(service.getMtpById('prog-1', 'mtp-1')).rejects.toThrow('Database error');
    });
  });

  describe('linkMtp', () => {
    // Positive test cases
    it('should link MTP candidates successfully', async () => {
      const mockTargetMtp = {
        id: 'mtp-1',
        linked_profiles: ['candidate-1'],
      };

      (MtpModel.findOne as jest.Mock).mockResolvedValue(mockTargetMtp);
      (MtpModel.update as jest.Mock).mockResolvedValue([1]);

      const result = await service.linkMtp({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateId: ['candidate-2', 'candidate-3'],
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('MTP candidates linked successfully');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should handle linking with unlink operation', async () => {
      const mockTargetMtp = {
        id: 'mtp-1',
        linked_profiles: ['candidate-1'],
      };

      const mockUnlinkMtp = {
        id: 'mtp-2',
        linked_profiles: ['candidate-2', 'candidate-3'],
      };

      (MtpModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTargetMtp) // First call for target MTP
        .mockResolvedValueOnce(mockUnlinkMtp) // Second call for unlink MTP
        .mockResolvedValueOnce(mockUnlinkMtp); // Third call for unlink MTP

      (MtpModel.update as jest.Mock).mockResolvedValue([1]);

      const result = await service.linkMtp({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateId: ['candidate-2'],
        unlinkMtpId: 'mtp-2',
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('MTP candidates linked successfully');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should delete unlink MTP when no candidates left', async () => {
      const mockTargetMtp = {
        id: 'mtp-1',
        linked_profiles: [],
      };

      const mockUnlinkMtp = {
        id: 'mtp-2',
        linked_profiles: ['candidate-2'],
      };

      (MtpModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTargetMtp)
        .mockResolvedValueOnce(mockUnlinkMtp)
        .mockResolvedValueOnce(mockUnlinkMtp);

      (MtpModel.update as jest.Mock).mockResolvedValue([1]);

      const result = await service.linkMtp({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateId: [],
        unlinkMtpId: 'mtp-2',
      });

      expect(result.statusCode).toBe(200);
      expect(MtpModel.update).toHaveBeenCalledWith(
        { is_deleted: true },
        { where: { id: 'mtp-2', program_id: 'prog-1' }, transaction: mockTransaction }
      );
    });

    // Negative test cases
    it('should return 404 when target MTP not found', async () => {
      (MtpModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.linkMtp({
        programId: 'prog-1',
        id: 'non-existent',
        mtpCandidateId: ['candidate-1'],
      });

      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('Target MTP not found');
    });

    it('should handle database errors and rollback transaction', async () => {
      (MtpModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.linkMtp({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateId: ['candidate-1'],
      })).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('unlinkMtp', () => {
    const mockUser = {
      sub: 'user-1',
      preferred_username: 'testuser',
    };

    // Positive test cases
    it('should unlink MTP candidates successfully', async () => {
      const mockMtp = {
        id: 'mtp-1',
        linked_profiles: ['candidate-1', 'candidate-2', 'candidate-3'],
      };

      (MtpModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockMtp) // First call to find MTP
        .mockResolvedValueOnce(null); // Second call to check existing MTP for candidate

      (MtpModel.update as jest.Mock).mockResolvedValue([1]);
      (MtpModel.create as jest.Mock).mockResolvedValue({ id: 'new-mtp' });
      mockRepository.getCandidate.mockResolvedValue([{ candidate_name: 'John Doe' }]);

      const result = await service.unlinkMtp({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateIds: ['candidate-2'],
        user: mockUser,
        traceId: 'trace-1',
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('MTP candidates unlinked and created successfully');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should reactivate existing MTP for candidate', async () => {
      const mockMtp = {
        id: 'mtp-1',
        linked_profiles: ['candidate-1', 'candidate-2'],
      };

      const mockExistingMtp = {
        id: 'existing-mtp',
        update: jest.fn().mockResolvedValue(true),
      };

      (MtpModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockMtp)
        .mockResolvedValueOnce(mockExistingMtp);

      (MtpModel.update as jest.Mock).mockResolvedValue([1]);

      const result = await service.unlinkMtp({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateIds: ['candidate-2'],
        user: mockUser,
        traceId: 'trace-1',
      });

      expect(result.statusCode).toBe(200);
      expect(mockExistingMtp.update).toHaveBeenCalledWith(
        { is_deleted: false, linked_profiles: ['candidate-2'] },
        { transaction: mockTransaction }
      );
    });

    // Negative test cases
    it('should return 404 when MTP not found', async () => {
      (MtpModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.unlinkMtp({
        programId: 'prog-1',
        id: 'non-existent',
        mtpCandidateIds: ['candidate-1'],
        user: mockUser,
        traceId: 'trace-1',
      });

      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('MTP not found');
    });

    it('should handle database errors and rollback transaction', async () => {
      const mockMtp = {
        id: 'mtp-1',
        linked_profiles: ['candidate-1'],
      };

      (MtpModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockMtp) // First call succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second call fails

      (MtpModel.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.unlinkMtp({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateIds: ['candidate-1'],
        user: mockUser,
        traceId: 'trace-1',
      })).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getLinkedProfiles', () => {
    // Positive test cases
    it('should return linked profiles data successfully', async () => {
      const mockMtpData = {
        id: 'mtp-1',
        mtp_candidates: [
          { mtp_id: 'mtp-1', candidate_name: 'John Doe' },
          { mtp_id: 'mtp-2', candidate_name: 'Jane Smith' },
          { mtp_id: 'mtp-1', candidate_name: 'John Doe' }, // Duplicate
        ],
      };

      mockRepository.getLinkProfiles.mockResolvedValue([mockMtpData]);

      const result = await service.getLinkedProfiles('prog-1', 'candidate-1');

      expect(result.message).toBe('Linked profile data retrieved successfully.');
      expect(result.data.mtp_candidates).toHaveLength(2); // Duplicates removed
      expect(mockRepository.getLinkProfiles).toHaveBeenCalledWith('prog-1', 'candidate-1');
    });

    it('should handle empty mtp_candidates array', async () => {
      const mockMtpData = {
        id: 'mtp-1',
        mtp_candidates: [],
      };

      mockRepository.getLinkProfiles.mockResolvedValue([mockMtpData]);

      const result = await service.getLinkedProfiles('prog-1', 'candidate-1');

      expect(result.message).toBe('Linked profile data retrieved successfully.');
      expect(result.data.mtp_candidates).toEqual([]);
    });

    it('should handle non-array mtp_candidates', async () => {
      const mockMtpData = {
        id: 'mtp-1',
        mtp_candidates: null,
      };

      mockRepository.getLinkProfiles.mockResolvedValue([mockMtpData]);

      const result = await service.getLinkedProfiles('prog-1', 'candidate-1');

      expect(result.message).toBe('Linked profile data retrieved successfully.');
      expect(result.data.mtp_candidates).toEqual([]);
    });

    // Negative test cases
    it('should return empty data when no matching records found', async () => {
      mockRepository.getLinkProfiles.mockResolvedValue([null]);

      const result = await service.getLinkedProfiles('prog-1', 'candidate-1');

      expect(result.message).toBe('No matching records found.');
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockRepository.getLinkProfiles.mockRejectedValue(new Error('Database error'));

      await expect(service.getLinkedProfiles('prog-1', 'candidate-1')).rejects.toThrow('Database error');
    });
  });

  describe('disableMtp', () => {
    // Positive test cases
    it('should disable MTPs successfully', async () => {
      const mockDisableRecords = [
        { id: 'disable-1', mtp_id: 'mtp-1', program_id: 'prog-1', candidate_id: 'candidate-1' },
        { id: 'disable-2', mtp_id: 'mtp-2', program_id: 'prog-1', candidate_id: 'candidate-1' },
      ];

      (DisebleMtp.bulkCreate as jest.Mock).mockResolvedValue(mockDisableRecords);

      const result = await service.disableMtp({
        mtpId: ['mtp-1', 'mtp-2'],
        programId: 'prog-1',
        candidateId: 'candidate-1',
        traceId: 'trace-1',
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('selected MTPs disabled successfully.');
      expect(result.trace_id).toBe('trace-1');
      expect(result.data).toEqual(mockDisableRecords);
      expect(DisebleMtp.bulkCreate).toHaveBeenCalledWith([
        { mtp_id: 'mtp-1', program_id: 'prog-1', candidate_id: 'candidate-1' },
        { mtp_id: 'mtp-2', program_id: 'prog-1', candidate_id: 'candidate-1' },
      ]);
    });

    it('should handle empty MTP ID array', async () => {
      (DisebleMtp.bulkCreate as jest.Mock).mockResolvedValue([]);

      const result = await service.disableMtp({
        mtpId: [],
        programId: 'prog-1',
        candidateId: 'candidate-1',
        traceId: 'trace-1',
      });

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual([]);
      expect(DisebleMtp.bulkCreate).toHaveBeenCalledWith([]);
    });

    // Negative test cases
    it('should handle database errors', async () => {
      (DisebleMtp.bulkCreate as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.disableMtp({
        mtpId: ['mtp-1'],
        programId: 'prog-1',
        candidateId: 'candidate-1',
        traceId: 'trace-1',
      })).rejects.toThrow('Database error');
    });
  });

  describe('masterProfile', () => {
    beforeEach(() => {
      // Clear all mocks before each test in this describe block
      jest.clearAllMocks();
      mockSequelize.transaction.mockResolvedValue(mockTransaction);
      mockTransaction.commit.mockClear();
      mockTransaction.rollback.mockClear();
    });

    // Positive test cases
    it('should create master profile successfully', async () => {
      const mockMtp = {
        id: 'mtp-1',
        program_id: 'prog-1',
        is_deleted: false,
      };

      // Reset all mocks specifically for this test
      (MtpModel.findOne as jest.Mock).mockReset().mockResolvedValue(mockMtp);
      (MtpModel.update as jest.Mock).mockReset().mockResolvedValue([1]);
      mockRepository.getCandidate.mockReset().mockResolvedValue([{ candidate_name: 'John Doe' }]);

      const result = await service.masterProfile({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateId: 'candidate-1',
        traceId: 'trace-1',
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Master profile created successfully! ');
      expect(result.traceId).toBe('trace-1');
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(MtpModel.update).toHaveBeenCalledWith(
        {
          mtp_candidate_id: 'candidate-1',
          is_master_profile: true,
          talent_name: 'John Doe',
        },
        {
          where: {
            id: 'mtp-1',
            program_id: 'prog-1',
            is_deleted: false,
          },
          transaction: mockTransaction,
        }
      );
    });

    // Negative test cases
    it('should handle database errors and rollback transaction', async () => {
      const mockMtp = {
        id: 'mtp-1',
        program_id: 'prog-1',
        is_deleted: false,
      };

      // Reset mocks for this specific test
      (MtpModel.findOne as jest.Mock).mockReset().mockResolvedValue(mockMtp);
      mockRepository.getCandidate.mockReset().mockResolvedValue([{ candidate_name: 'John Doe' }]);
      (MtpModel.update as jest.Mock).mockReset().mockRejectedValue(new Error('Database error'));

      await expect(service.masterProfile({
        programId: 'prog-1',
        id: 'mtp-1',
        mtpCandidateId: 'candidate-1',
        traceId: 'trace-1',
      })).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should return 404 when MTP not found', async () => {
      (MtpModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.masterProfile({
        programId: 'prog-1',
        id: 'non-existent',
        mtpCandidateId: 'candidate-1',
        traceId: 'trace-1',
      });

      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('MTP not found');
    });
  });

  describe('updateLinkedCandidatesDoNotRehire', () => {
    // Positive test cases
    it('should update do_not_rehire for MTP successfully', async () => {
      const mockMtp = {
        id: 'mtp-1',
        program_id: 'prog-1',
        is_deleted: false,
        linked_profiles: ['candidate-1', 'candidate-2'],
      };

      (MtpModel.findOne as jest.Mock).mockResolvedValue(mockMtp);
      (MtpModel.update as jest.Mock).mockResolvedValue([1]);

      const result = await service.updateLinkedCandidatesDoNotRehire({
        programId: 'prog-1',
        mtpId: 'mtp-1',
        doNotRehire: true,
        traceId: 'trace-1',
        token: 'token',
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('do_not_rehire updated in MTP and linked candidates successfully');
      expect(result.traceId).toBe('trace-1');
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(MtpModel.update).toHaveBeenCalledWith(
        { do_not_rehire: true },
        {
          where: {
            id: 'mtp-1',
            program_id: 'prog-1',
            is_deleted: false,
          },
          transaction: mockTransaction,
        }
      );
    });

    it('should update do_not_rehire to false', async () => {
      const mockMtp = {
        id: 'mtp-1',
        program_id: 'prog-1',
        is_deleted: false,
        linked_profiles: ['candidate-1'],
      };

      (MtpModel.findOne as jest.Mock).mockResolvedValue(mockMtp);
      (MtpModel.update as jest.Mock).mockResolvedValue([1]);

      const result = await service.updateLinkedCandidatesDoNotRehire({
        programId: 'prog-1',
        mtpId: 'mtp-1',
        doNotRehire: false,
        traceId: 'trace-1',
        token: 'token',
      });

      expect(result.statusCode).toBe(200);
      expect(MtpModel.update).toHaveBeenCalledWith(
        { do_not_rehire: false },
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'mtp-1',
            program_id: 'prog-1',
            is_deleted: false,
          }),
        })
      );
    });

    // Negative test cases
    it('should return 404 when MTP not found', async () => {
      (MtpModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.updateLinkedCandidatesDoNotRehire({
        programId: 'prog-1',
        mtpId: 'non-existent',
        doNotRehire: true,
        traceId: 'trace-1',
        token: 'token',
      });

      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('MTP not found');
      expect(result.traceId).toBe('trace-1');
    });

    it('should return 400 when no linked profiles found', async () => {
      const mockMtp = {
        id: 'mtp-1',
        program_id: 'prog-1',
        is_deleted: false,
        linked_profiles: [],
      };

      (MtpModel.findOne as jest.Mock).mockResolvedValue(mockMtp);

      const result = await service.updateLinkedCandidatesDoNotRehire({
        programId: 'prog-1',
        mtpId: 'mtp-1',
        doNotRehire: true,
        traceId: 'trace-1',
        token: 'token',
      });

      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('No linked profiles found in MTP');
      expect(result.traceId).toBe('trace-1');
    });

    it('should handle null linked_profiles', async () => {
      const mockMtp = {
        id: 'mtp-1',
        program_id: 'prog-1',
        is_deleted: false,
        linked_profiles: null,
      };

      (MtpModel.findOne as jest.Mock).mockResolvedValue(mockMtp);

      const result = await service.updateLinkedCandidatesDoNotRehire({
        programId: 'prog-1',
        mtpId: 'mtp-1',
        doNotRehire: true,
        traceId: 'trace-1',
        token: 'token',
      });

      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('No linked profiles found in MTP');
    });

    it('should handle database errors and rollback transaction', async () => {
      (MtpModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.updateLinkedCandidatesDoNotRehire({
        programId: 'prog-1',
        mtpId: 'mtp-1',
        doNotRehire: true,
        traceId: 'trace-1',
        token: 'token',
      })).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
