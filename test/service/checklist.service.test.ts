// Mock Sequelize before any imports
const mockSequelize = {
    transaction: jest.fn(),
    define: jest.fn(),
    init: jest.fn(),
    sync: jest.fn(),
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
      CHAR: jest.fn(),
      DECIMAL: jest.fn(),
      FLOAT: jest.fn(),
      DOUBLE: jest.fn(),
      REAL: jest.fn(),
      TIME: jest.fn(),
      DATETIME: jest.fn(),
      NOW: jest.fn(),
      BLOB: jest.fn(),
      LONGTEXT: jest.fn(),
      MEDIUMTEXT: jest.fn(),
      TINYTEXT: jest.fn(),
      LONGBLOB: jest.fn(),
      MEDIUMBLOB: jest.fn(),
      TINYBLOB: jest.fn(),
      VARBINARY: jest.fn(),
      BINARY: jest.fn(),
      GEOMETRY: jest.fn(),
      GEOGRAPHY: jest.fn(),
      POINT: jest.fn(),
      LINE: jest.fn(),
      POLYGON: jest.fn(),
      MULTIPOINT: jest.fn(),
      MULTILINE: jest.fn(),
      MULTIPOLYGON: jest.fn(),
      GEOMETRYCOLLECTION: jest.fn(),
      RANGE: jest.fn(),
      ARRAY: jest.fn(),
      VIRTUAL: jest.fn(),
      CITEXT: jest.fn(),
      HSTORE: jest.fn(),
      INET: jest.fn(),
      MACADDR: jest.fn(),
      CIDR: jest.fn(),
      TSVECTOR: jest.fn(),
      TSQUERY: jest.fn(),
      SMALLINT: jest.fn(),
      TINYINT: jest.fn(),
      MEDIUMINT: jest.fn(),
      NUMERIC: jest.fn(),
      CURRENCY: jest.fn(),
      MONEY: jest.fn(),
      BIT: jest.fn(),
      YEAR: jest.fn(),
      TIMESTAMP: jest.fn(),
      DATETIME2: jest.fn(),
      SMALLDATETIME: jest.fn(),
      DATETIMEOFFSET: jest.fn(),
      UNIQUEIDENTIFIER: jest.fn(),
      NCHAR: jest.fn(),
      NVARCHAR: jest.fn(),
      NTEXT: jest.fn(),
      IMAGE: jest.fn(),
      SQL_VARIANT: jest.fn(),
      XML: jest.fn(),
      TABLE: jest.fn(),
      CURSOR: jest.fn(),
      ROWID: jest.fn(),
      UROWID: jest.fn(),
      ROWVERSION: jest.fn(),
      HIERARCHYID: jest.fn(),
      SYSNAME: jest.fn(),
      FILESTREAM: jest.fn(),
      SPATIAL: jest.fn(),
      MULTILINESTRING: jest.fn(),
      LINESTRING: jest.fn(),
      CIRCULARSTRING: jest.fn(),
      COMPOUNDCURVE: jest.fn(),
      CURVEPOLYGON: jest.fn(),
      FULLTEXT: jest.fn(),
    },
    Op: {
      and: 'and',
      or: 'or',
      like: 'like',
      iLike: 'iLike',
      eq: 'eq',
      ne: 'ne',
      in: 'in',
      notIn: 'notIn',
      is: 'is',
      not: 'not',
      col: jest.fn(),
      fn: jest.fn(),
    },
    col: jest.fn(),
    fn: jest.fn(),
  }));
  
  // Mock database configuration
  jest.mock('../../src/config/db', () => ({
    databaseConfig: {
      config: {
        database_config: {},
      },
    },
  }));
  
  // Mock all models
  jest.mock('../../src/models/tenant.model');
  jest.mock('../../src/models/programs.model');
  jest.mock('../../src/models/program-vendor.model');
  jest.mock('../../src/models/countries.model');
  jest.mock('../../src/models/user.model');
  jest.mock('../../src/models/qualifications.model');
  jest.mock('../../src/models/qualification-type-model');
  jest.mock('../../src/models/job-category.model');
  jest.mock('../../src/models/job-template.model');
  jest.mock('../../src/models/labour-category.model');
  jest.mock('../../src/models/cadidate-custom-field.model');
  jest.mock('../../src/models/programs-config.model');
  jest.mock('../../src/models/currencies.model');
  jest.mock('../../src/models/checklist.model');
  jest.mock('../../src/models/checklist-mapping.model');
  jest.mock('../../src/utility/checklist-service');
  jest.mock('../../src/config/instance', () => ({
    sequelize: mockSequelize,
  }));
  
  // Now import the service
  import { ChecklistService } from '../../src/service/checklist.service';
  import Checklist from '../../src/models/checklist.model';
  import ChecklistMapping from '../../src/models/checklist-mapping.model';
  import { checkIfChecklistNameExists } from '../../src/utility/checklist-service';
  
  const mockChecklist = Checklist as jest.Mocked<typeof Checklist>;
  const mockChecklistMapping = ChecklistMapping as jest.Mocked<typeof ChecklistMapping>;
  const mockCheckIfChecklistNameExists = checkIfChecklistNameExists as jest.MockedFunction<typeof checkIfChecklistNameExists>;
  
  describe('ChecklistService', () => {
    let checklistService: ChecklistService;
    let mockTransaction: any;
  
    beforeEach(() => {
      checklistService = new ChecklistService();
      jest.clearAllMocks();
  
      // Mock transaction
      mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      mockSequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);
    });
  
    describe('createCheckList', () => {
      const mockCheckListData = {
        name: 'Test Checklist',
        description: 'Test Description',
        is_enabled: true,
        associations: {},
        task_category_configs: [
          {
            seq_no: 1,
            is_mandatory: true,
            trigger: 'manual',
            actor_org_type: 'vendor',
            actor_role_id: 'role1',
            actor_role_name: 'Actor Role',
            reviewer_org_type: 'client',
            reviewer_role_id: 'role2',
            reviewer_role_name: 'Reviewer Role',
            start_date: '2024-01-01',
            due_date: '2024-12-31',
            category_id: 'cat1',
            category_name: 'Category 1',
            task_entity_id: 'task1',
            task_version_id: 'v1',
            task_name: 'Task 1',
          }
        ],
        sourcing_model: 'contingent',
        created_by: 'user1',
        updated_by: 'user1',
      } as any;
  
      const programId = 'program-1';
      const userId = 'user-1';
  
      describe('Positive Test Cases', () => {
        it('should create checklist successfully with task category configs', async () => {
          // Arrange
          mockCheckIfChecklistNameExists.mockResolvedValue(false);
          const mockCreatedChecklist = {
            version_id: 'v1',
            entity_id: 'entity-1',
            created_by: userId,
            updated_by: userId,
          };
          mockChecklist.create.mockResolvedValue(mockCreatedChecklist as any);
          mockChecklistMapping.bulkCreate.mockResolvedValue([] as any);
  
          // Act
          const result = await checklistService.createCheckList(mockCheckListData, programId, userId);
  
          // Assert
          expect(mockCheckIfChecklistNameExists).toHaveBeenCalledWith('Test Checklist', programId);
          expect(mockSequelize.transaction).toHaveBeenCalled();
          expect(mockChecklist.create).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'Test Checklist',
              program_id: programId,
              created_by: userId,
              updated_by: userId,
            }),
            { transaction: mockTransaction }
          );
          expect(mockChecklistMapping.bulkCreate).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                checklist_version_id: 'v1',
                checklist_entity_id: 'entity-1',
                seq_no: 1,
                is_mandatory: true,
              })
            ]),
            { transaction: mockTransaction }
          );
          expect(mockTransaction.commit).toHaveBeenCalled();
          expect(result).toEqual(mockCreatedChecklist);
        });
  
        it('should create checklist successfully without task category configs', async () => {
          // Arrange
          const checkListDataWithoutConfigs = { ...mockCheckListData, task_category_configs: [] };
          mockCheckIfChecklistNameExists.mockResolvedValue(false);
          const mockCreatedChecklist = {
            version_id: 'v1',
            entity_id: 'entity-1',
            created_by: userId,
            updated_by: userId,
          };
          mockChecklist.create.mockResolvedValue(mockCreatedChecklist as any);
  
          // Act
          const result = await checklistService.createCheckList(checkListDataWithoutConfigs, programId, userId);
  
          // Assert
          expect(mockChecklist.create).toHaveBeenCalled();
          expect(mockChecklistMapping.bulkCreate).not.toHaveBeenCalled();
          expect(mockTransaction.commit).toHaveBeenCalled();
          expect(result).toEqual(mockCreatedChecklist);
        });
  
        it('should create checklist with non-array task_category_configs (should be ignored)', async () => {
          // Arrange
          const checkListDataWithNonArray = { ...mockCheckListData, task_category_configs: null as any };
          mockCheckIfChecklistNameExists.mockResolvedValue(false);
          const mockCreatedChecklist = {
            version_id: 'v1',
            entity_id: 'entity-1',
            created_by: userId,
            updated_by: userId,
          };
          mockChecklist.create.mockResolvedValue(mockCreatedChecklist as any);
  
          // Act
          const result = await checklistService.createCheckList(checkListDataWithNonArray, programId, userId);
  
          // Assert
          expect(mockChecklist.create).toHaveBeenCalled();
          expect(mockChecklistMapping.bulkCreate).not.toHaveBeenCalled();
          expect(mockTransaction.commit).toHaveBeenCalled();
          expect(result).toEqual(mockCreatedChecklist);
        });
      });
  
      describe('Negative Test Cases', () => {
        it('should throw error if checklist name already exists', async () => {
          // Arrange
          mockCheckIfChecklistNameExists.mockResolvedValue(true);
  
          // Act & Assert
          await expect(checklistService.createCheckList(mockCheckListData, programId, userId))
            .rejects.toThrow('Checklist with name Test Checklist already exists for this program.');
          
          expect(mockSequelize.transaction).not.toHaveBeenCalled();
          expect(mockChecklist.create).not.toHaveBeenCalled();
        });
  
        it('should rollback transaction and throw error if checklist creation fails', async () => {
          // Arrange
          mockCheckIfChecklistNameExists.mockResolvedValue(false);
          const dbError = new Error('Database error');
          mockChecklist.create.mockRejectedValue(dbError);
  
          // Act & Assert
          await expect(checklistService.createCheckList(mockCheckListData, programId, userId))
            .rejects.toThrow('Database error');
          
          expect(mockTransaction.rollback).toHaveBeenCalled();
          expect(mockTransaction.commit).not.toHaveBeenCalled();
        });
  
        it('should rollback transaction and throw error if task mapping creation fails', async () => {
          // Arrange
          mockCheckIfChecklistNameExists.mockResolvedValue(false);
          const mockCreatedChecklist = {
            version_id: 'v1',
            entity_id: 'entity-1',
            created_by: userId,
            updated_by: userId,
          };
          mockChecklist.create.mockResolvedValue(mockCreatedChecklist as any);
          const mappingError = new Error('Mapping creation failed');
          mockChecklistMapping.bulkCreate.mockRejectedValue(mappingError);
  
          // Act & Assert
          await expect(checklistService.createCheckList(mockCheckListData, programId, userId))
            .rejects.toThrow('Mapping creation failed');
          
          expect(mockTransaction.rollback).toHaveBeenCalled();
          expect(mockTransaction.commit).not.toHaveBeenCalled();
        });
      });
  
      describe('Edge Cases', () => {
        it('should handle empty task_category_configs array', async () => {
          // Arrange
          const checkListDataWithEmptyArray = { ...mockCheckListData, task_category_configs: [] };
          mockCheckIfChecklistNameExists.mockResolvedValue(false);
          const mockCreatedChecklist = {
            version_id: 'v1',
            entity_id: 'entity-1',
            created_by: userId,
            updated_by: userId,
          };
          mockChecklist.create.mockResolvedValue(mockCreatedChecklist as any);
  
          // Act
          const result = await checklistService.createCheckList(checkListDataWithEmptyArray, programId, userId);
  
          // Assert
          expect(mockChecklistMapping.bulkCreate).not.toHaveBeenCalled();
          expect(mockTransaction.commit).toHaveBeenCalled();
          expect(result).toEqual(mockCreatedChecklist);
        });
  
        it('should handle task_category_configs with missing optional fields', async () => {
          // Arrange
          const checkListDataWithMinimalConfigs = {
            ...mockCheckListData,
            task_category_configs: [
              {
                seq_no: 1,
                trigger: 'manual',
                actor_org_type: 'vendor',
                actor_role_id: 'role1',
                actor_role_name: 'Actor Role',
                reviewer_org_type: 'client',
                reviewer_role_id: 'role2',
                reviewer_role_name: 'Reviewer Role',
                category_id: 'cat1',
                category_name: 'Category 1',
                task_entity_id: 'task1',
                task_version_id: 'v1',
                task_name: 'Task 1',
              }
            ]
          };
          mockCheckIfChecklistNameExists.mockResolvedValue(false);
          const mockCreatedChecklist = {
            version_id: 'v1',
            entity_id: 'entity-1',
            created_by: userId,
            updated_by: userId,
          };
          mockChecklist.create.mockResolvedValue(mockCreatedChecklist as any);
          mockChecklistMapping.bulkCreate.mockResolvedValue([] as any);
  
          // Act
          const result = await checklistService.createCheckList(checkListDataWithMinimalConfigs, programId, userId);
  
          // Assert
          expect(mockChecklistMapping.bulkCreate).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                is_mandatory: false, // default value
                is_enabled: true, // default value
                is_deleted: false, // default value
                has_dependency: false, // default value
              })
            ]),
            { transaction: mockTransaction }
          );
          expect(result).toEqual(mockCreatedChecklist);
        });
      });
    });
  
    describe('getChecklistById', () => {
      const entityId = 'entity-1';
      const version = '1.0';
  
      describe('Positive Test Cases', () => {
        it('should get checklist by entity_id with latest version', async () => {
          // Arrange
          const mockChecklistData = {
            dataValues: {
              version_id: 'v1',
              entity_id: entityId,
              name: 'Test Checklist',
              version: 1,
              latest: true,
            },
            version_id: 'v1',
            entity_id: entityId,
            name: 'Test Checklist',
            version: 1,
            latest: true,
          };
          mockChecklist.findOne.mockResolvedValue(mockChecklistData as any);
          
          const mockTaskMappings = [
            { dataValues: { id: 1, task_name: 'Task 1' } },
            { dataValues: { id: 2, task_name: 'Task 2' } }
          ];
          mockChecklistMapping.findAll.mockResolvedValue(mockTaskMappings as any);
  
          // Act
          const result = await checklistService.getChecklistById(entityId);
  
          // Assert
          expect(mockChecklist.findOne).toHaveBeenCalledWith({
            where: { entity_id: entityId, latest: true },
            includes: []
          });
          expect(mockChecklistMapping.findAll).toHaveBeenCalledWith({
            where: { checklist_version_id: 'v1' }
          });
          expect(result).toEqual({
            ...mockChecklistData.dataValues,
            task_category_configs: mockTaskMappings.map(task => task.dataValues)
          });
        });
  
        it('should get checklist by entity_id with specific version', async () => {
          // Arrange
          const mockChecklistData = {
            dataValues: {
              version_id: 'v1',
              entity_id: entityId,
              name: 'Test Checklist',
              version: 1,
              latest: false,
            },
            version_id: 'v1',
            entity_id: entityId,
            name: 'Test Checklist',
            version: 1,
            latest: false,
          };
          mockChecklist.findOne.mockResolvedValue(mockChecklistData as any);
          mockChecklistMapping.findAll.mockResolvedValue([] as any);
  
          // Act
          const result = await checklistService.getChecklistById(entityId, version);
  
          // Assert
          expect(mockChecklist.findOne).toHaveBeenCalledWith({
            where: { entity_id: entityId, version },
            includes: []
          });
          expect(result).toEqual({
            ...mockChecklistData.dataValues,
            task_category_configs: []
          });
        });
      });
  
      describe('Negative Test Cases', () => {
        it('should throw error if checklist not found', async () => {
          // Arrange
          mockChecklist.findOne.mockResolvedValue(null);
  
          // Act & Assert
          await expect(checklistService.getChecklistById(entityId))
            .rejects.toThrow('Checklist not found');
          
          expect(mockChecklistMapping.findAll).not.toHaveBeenCalled();
        });
  
        it('should throw error if task mappings query fails', async () => {
          // Arrange
          const mockChecklistData = {
            dataValues: {
              version_id: 'v1',
              entity_id: entityId,
              name: 'Test Checklist',
            }
          };
          mockChecklist.findOne.mockResolvedValue(mockChecklistData as any);
          const dbError = new Error('Database error');
          mockChecklistMapping.findAll.mockRejectedValue(dbError);
  
          // Act & Assert
          await expect(checklistService.getChecklistById(entityId))
            .rejects.toThrow('Database error');
        });
      });
    });
  
    describe('updateCheckList', () => {
      const entityId = 'entity-1';
      const programId = 'program-1';
      const userId = 'user-1';
      const mockCheckListData = {
        name: 'Updated Checklist',
        description: 'Updated Description',
        is_enabled: true,
        associations: {},
        task_category_configs: [
          {
            seq_no: 1,
            is_mandatory: true,
            trigger: 'manual',
            actor_org_type: 'vendor',
            actor_role_id: 'role1',
            actor_role_name: 'Actor Role',
            reviewer_org_type: 'client',
            reviewer_role_id: 'role2',
            reviewer_role_name: 'Reviewer Role',
            start_date: '2024-01-01',
            due_date: '2024-12-31',
            category_id: 'cat1',
            category_name: 'Category 1',
            task_entity_id: 'task1',
            task_version_id: 'v1',
            task_name: 'Task 1',
            has_dependency: false,
            dependency_task_entity_id: null,
            dependency_category_id: null,
          }
        ],
        sourcing_model: 'contingent',
        created_by: 'user1',
        updated_by: 'user1',
      } as any;
  
      describe('Positive Test Cases', () => {
        it('should update checklist successfully with new version', async () => {
          // Arrange
          const existingChecklist = {
            version: 1,
            version_id: 'v1',
            pre_checklist_entity_id: 'pre-entity',
            pre_checklist_version: 1,
          };
          mockChecklist.findOne
            .mockResolvedValueOnce(null) // No duplicate name
            .mockResolvedValueOnce(existingChecklist as any); // Existing checklist
          
          const newChecklist = {
            version_id: 'v2',
            entity_id: entityId,
            version: 2,
          };
          mockChecklist.create.mockResolvedValue(newChecklist as any);
          mockChecklistMapping.bulkCreate.mockResolvedValue([] as any);
  
          // Act
          await checklistService.updateCheckList(entityId, programId, mockCheckListData, userId);
  
          // Assert
          expect(mockSequelize.transaction).toHaveBeenCalled();
          expect(mockChecklist.update).toHaveBeenCalledWith(
            { latest: false, updated_on: expect.any(BigInt), updated_by: 'user1' },
            { where: { version_id: 'v1' }, transaction: mockTransaction }
          );
          expect(mockChecklist.create).toHaveBeenCalledWith(
            expect.objectContaining({
              entity_id: entityId,
              program_id: programId,
              version: 2,
              name: 'Updated Checklist',
              latest: true,
              created_by: userId,
              updated_by: userId,
            }),
            { transaction: mockTransaction }
          );
          expect(mockTransaction.commit).toHaveBeenCalled();
        });
  
        it('should update checklist when no existing checklist found', async () => {
          // Arrange
          mockChecklist.findOne
            .mockResolvedValueOnce(null) // No duplicate name
            .mockResolvedValueOnce(null); // No existing checklist
          
          const newChecklist = {
            version_id: 'v1',
            entity_id: entityId,
            version: 1,
          };
          mockChecklist.create.mockResolvedValue(newChecklist as any);
          mockChecklistMapping.bulkCreate.mockResolvedValue([] as any);
  
          // Act
          await checklistService.updateCheckList(entityId, programId, mockCheckListData, userId);
  
          // Assert
          expect(mockChecklist.create).toHaveBeenCalledWith(
            expect.objectContaining({
              version: 1,
              previous_version_id: null,
            }),
            { transaction: mockTransaction }
          );
          expect(mockTransaction.commit).toHaveBeenCalled();
        });
  
        it('should update checklist when is_enabled is false (no duplicate check)', async () => {
          // Arrange
          const checkListDataDisabled = { ...mockCheckListData, is_enabled: false };
          const existingChecklist = {
            version: 1,
            version_id: 'v1',
          };
          mockChecklist.findOne
            .mockResolvedValueOnce(existingChecklist as any); // Existing checklist (no duplicate check for disabled)
          
          const newChecklist = {
            version_id: 'v2',
            entity_id: entityId,
            version: 2,
          };
          mockChecklist.create.mockResolvedValue(newChecklist as any);
          mockChecklistMapping.bulkCreate.mockResolvedValue([] as any);
  
          // Act
          await checklistService.updateCheckList(entityId, programId, checkListDataDisabled, userId);
  
          // Assert
          expect(mockChecklist.findOne).toHaveBeenCalledTimes(1); // Only existing checklist check
          expect(mockTransaction.commit).toHaveBeenCalled();
        });
      });
  
      describe('Negative Test Cases', () => {
        it('should throw error if task_category_configs is not an array', async () => {
          // Arrange
          const invalidData = { ...mockCheckListData, task_category_configs: 'not-an-array' as any };
  
          // Act & Assert
          await expect(checklistService.updateCheckList(entityId, programId, invalidData, userId))
            .rejects.toThrow('`task_category_configs` must be an array.');
          
          expect(mockSequelize.transaction).not.toHaveBeenCalled();
        });
  
        it('should throw error if duplicate name exists when enabling checklist', async () => {
          // Arrange
          const duplicateChecklist = {
            entity_id: 'other-entity',
            name: 'Updated Checklist',
          };
          mockChecklist.findOne.mockResolvedValue(duplicateChecklist as any);
  
          // Act & Assert
          await expect(checklistService.updateCheckList(entityId, programId, mockCheckListData, userId))
            .rejects.toThrow('A checklist with the same name is already enabled for this program.');
          
          expect(mockTransaction.rollback).toHaveBeenCalled();
          expect(mockTransaction.commit).not.toHaveBeenCalled();
        });
  
        it('should throw error if new checklist creation fails', async () => {
          // Arrange
          mockChecklist.findOne
            .mockResolvedValueOnce(null) // No duplicate name
            .mockResolvedValueOnce({ version: 1, version_id: 'v1' } as any); // Existing checklist
          
          const dbError = new Error('Creation failed');
          mockChecklist.create.mockRejectedValue(dbError);
  
          // Act & Assert
          await expect(checklistService.updateCheckList(entityId, programId, mockCheckListData, userId))
            .rejects.toThrow('Creation failed');
          
          expect(mockTransaction.rollback).toHaveBeenCalled();
          expect(mockTransaction.commit).not.toHaveBeenCalled();
        });
  
        it('should throw error if task mapping creation fails', async () => {
          // Arrange
          mockChecklist.findOne
            .mockResolvedValueOnce(null) // No duplicate name
            .mockResolvedValueOnce({ version: 1, version_id: 'v1' } as any); // Existing checklist
          
          const newChecklist = {
            version_id: 'v2',
            entity_id: entityId,
            version: 2,
          };
          mockChecklist.create.mockResolvedValue(newChecklist as any);
          const mappingError = new Error('Mapping creation failed');
          mockChecklistMapping.bulkCreate.mockRejectedValue(mappingError);
  
          // Act & Assert
          await expect(checklistService.updateCheckList(entityId, programId, mockCheckListData, userId))
            .rejects.toThrow('Mapping creation failed');
          
          expect(mockTransaction.rollback).toHaveBeenCalled();
          expect(mockTransaction.commit).not.toHaveBeenCalled();
        });
      });
  
      describe('Edge Cases', () => {
        it('should handle empty task_category_configs array', async () => {
          // Arrange
          const checkListDataWithEmptyArray = { ...mockCheckListData, task_category_configs: [] };
          mockChecklist.findOne
            .mockResolvedValueOnce(null) // No duplicate name
            .mockResolvedValueOnce({ version: 1, version_id: 'v1' } as any); // Existing checklist
          
          const newChecklist = {
            version_id: 'v2',
            entity_id: entityId,
            version: 2,
          };
          mockChecklist.create.mockResolvedValue(newChecklist as any);
          mockChecklistMapping.bulkCreate.mockResolvedValue([] as any);
  
          // Act
          await checklistService.updateCheckList(entityId, programId, checkListDataWithEmptyArray, userId);
  
          // Assert
          expect(mockChecklistMapping.bulkCreate).toHaveBeenCalledWith([], { transaction: mockTransaction });
          expect(mockTransaction.commit).toHaveBeenCalled();
        });
  
        it('should handle task_category_configs with null/undefined optional fields', async () => {
          // Arrange
          const checkListDataWithNullFields = {
            ...mockCheckListData,
            task_category_configs: [
              {
                seq_no: 1,
                trigger: 'manual',
                actor_org_type: 'vendor',
                actor_role_id: 'role1',
                actor_role_name: 'Actor Role',
                reviewer_org_type: 'client',
                reviewer_role_id: 'role2',
                reviewer_role_name: 'Reviewer Role',
                category_id: 'cat1',
                category_name: 'Category 1',
                task_entity_id: 'task1',
                task_version_id: 'v1',
                task_name: 'Task 1',
                start_date: null,
                due_date: null,
                dependency: null,
              }
            ]
          };
          mockChecklist.findOne
            .mockResolvedValueOnce(null) // No duplicate name
            .mockResolvedValueOnce({ version: 1, version_id: 'v1' } as any); // Existing checklist
          
          const newChecklist = {
            version_id: 'v2',
            entity_id: entityId,
            version: 2,
          };
          mockChecklist.create.mockResolvedValue(newChecklist as any);
          mockChecklistMapping.bulkCreate.mockResolvedValue([] as any);
  
          // Act
          await checklistService.updateCheckList(entityId, programId, checkListDataWithNullFields, userId);
  
          // Assert
          expect(mockChecklistMapping.bulkCreate).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                start_date: null,
                due_date: null,
                dependency: null,
              })
            ]),
            { transaction: mockTransaction }
          );
          expect(mockTransaction.commit).toHaveBeenCalled();
        });
      });
    });
  
    describe('enableDisableChecklist', () => {
      const programId = 'program-1';
      const entityId = 'entity-1';
  
      describe('Positive Test Cases', () => {
        it('should enable checklist successfully', async () => {
          // Arrange
          const mockChecklistData = {
            id: 'checklist-1',
            name: 'Test Checklist',
          };
          mockChecklist.findOne.mockResolvedValue(mockChecklistData as any);
          mockChecklist.update.mockResolvedValue([1] as any);
  
          // Act
          await checklistService.enableDisableChecklist(programId, entityId, true);
  
          // Assert
          expect(mockChecklist.findOne).toHaveBeenCalledWith({
            where: { program_id: programId, entity_id: entityId, latest: true, is_deleted: false }
          });
          expect(mockChecklist.update).toHaveBeenCalledWith(
            { is_enabled: true, updated_on: expect.any(BigInt) },
            { where: { program_id: programId, entity_id: entityId, latest: true, is_deleted: false } }
          );
        });
  
        it('should disable checklist successfully', async () => {
          // Arrange
          const mockChecklistData = {
            id: 'checklist-1',
            name: 'Test Checklist',
          };
          mockChecklist.findOne.mockResolvedValue(mockChecklistData as any);
          mockChecklist.update.mockResolvedValue([1] as any);
  
          // Act
          await checklistService.enableDisableChecklist(programId, entityId, false);
  
          // Assert
          expect(mockChecklist.update).toHaveBeenCalledWith(
            { is_enabled: false, updated_on: expect.any(BigInt) },
            { where: { program_id: programId, entity_id: entityId, latest: true, is_deleted: false } }
          );
        });
      });
  
      describe('Negative Test Cases', () => {
        it('should throw error if program_id is missing', async () => {
          // Act & Assert
          await expect(checklistService.enableDisableChecklist('', entityId, true))
            .rejects.toThrow('Program ID and Entity ID are required');
          
          expect(mockChecklist.findOne).not.toHaveBeenCalled();
        });
  
        it('should throw error if entity_id is missing', async () => {
          // Act & Assert
          await expect(checklistService.enableDisableChecklist(programId, '', true))
            .rejects.toThrow('Program ID and Entity ID are required');
          
          expect(mockChecklist.findOne).not.toHaveBeenCalled();
        });
  
        it('should throw error if is_enabled is undefined', async () => {
          // Act & Assert
          await expect(checklistService.enableDisableChecklist(programId, entityId, undefined as any))
            .rejects.toThrow("'is_enabled' is required in the payload");
          
          expect(mockChecklist.findOne).not.toHaveBeenCalled();
        });
  
        it('should throw error if checklist not found', async () => {
          // Arrange
          mockChecklist.findOne.mockResolvedValue(null);
  
          // Act & Assert
          await expect(checklistService.enableDisableChecklist(programId, entityId, true))
            .rejects.toThrow('Checklist not found');
          
          expect(mockChecklist.update).not.toHaveBeenCalled();
        });
      });
    });
  
    describe('filterChecklists', () => {
      const programId = 'program-1';
  
      describe('Positive Test Cases', () => {
        it('should filter checklists with all parameters', async () => {
          // Arrange
          const filters = {
            is_enabled: true,
            name: 'test',
            sourcing_model: 'contingent' as const,
            limit: '10',
            page: '1',
          };
          
          const mockChecklists = {
            rows: [
              {
                get: () => ({
                  version_id: 'v1',
                  entity_id: 'entity-1',
                  name: 'Test Checklist',
                  task_count: 5,
                })
              }
            ],
            count: [{ total: 1 }]
          };
          mockChecklist.findAndCountAll.mockResolvedValue(mockChecklists as any);
  
          // Act
          const result = await checklistService.filterChecklists(programId, filters);
  
          // Assert
          expect(mockChecklist.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                latest: true,
                is_deleted: false,
                program_id: programId,
                is_enabled: true,
                name: expect.objectContaining({}),
                sourcing_model: 'contingent',
              }),
              limit: 10,
              offset: 0,
            })
          );
          expect(result).toEqual({
            checklists: [{ version_id: 'v1', entity_id: 'entity-1', name: 'Test Checklist', task_count: 5 }],
            total_count: 1,
            current_page: 1,
          });
        });
  
        it('should filter checklists with string boolean values', async () => {
          // Arrange
          const filters = {
            is_enabled: 'false' as any,
            limit: '5',
            page: '2',
          };
          
          const mockChecklists = {
            rows: [],
            count: []
          };
          mockChecklist.findAndCountAll.mockResolvedValue(mockChecklists as any);
  
          // Act
          const result = await checklistService.filterChecklists(programId, filters);
  
          // Assert
          expect(mockChecklist.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                is_enabled: false,
              }),
              limit: 5,
              offset: 5,
            })
          );
          expect(result.current_page).toBe(2);
        });
  
        it('should filter checklists with default pagination', async () => {
          // Arrange
          const filters = {};
          const mockChecklists = {
            rows: [],
            count: []
          };
          mockChecklist.findAndCountAll.mockResolvedValue(mockChecklists as any);
  
          // Act
          const result = await checklistService.filterChecklists(programId, filters);
  
          // Assert
          expect(mockChecklist.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({
              limit: 10,
              offset: 0,
            })
          );
          expect(result.current_page).toBe(1);
        });
      });
  
      describe('Edge Cases', () => {
        it('should handle invalid boolean string values', async () => {
          // Arrange
          const filters = {
            is_enabled: 'invalid' as any,
          };
          
          const mockChecklists = {
            rows: [],
            count: []
          };
          mockChecklist.findAndCountAll.mockResolvedValue(mockChecklists as any);
  
          // Act
          const result = await checklistService.filterChecklists(programId, filters);
  
          // Assert
          expect(mockChecklist.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.not.objectContaining({
                is_enabled: expect.anything(),
              }),
            })
          );
        });
  
        it('should handle non-numeric limit and page values', async () => {
          // Arrange
          const filters = {
            limit: 'invalid' as any,
            page: 'invalid' as any,
          };
          
          const mockChecklists = {
            rows: [],
            count: []
          };
          mockChecklist.findAndCountAll.mockResolvedValue(mockChecklists as any);
  
          // Act
          const result = await checklistService.filterChecklists(programId, filters);
  
          // Assert
          expect(mockChecklist.findAndCountAll).toHaveBeenCalledWith(
            expect.objectContaining({
              limit: NaN,
              offset: NaN,
            })
          );
        });
      });
    });
  
    describe('listChecklists', () => {
      const programId = 'program-1';
  
      describe('Positive Test Cases', () => {
        it('should list all enabled checklists without name filter', async () => {
          // Arrange
          const mockChecklists = [
            {
              name: 'Checklist 1',
              entity_id: 'entity-1',
              version: 1,
              version_id: 'v1',
            },
            {
              name: 'Checklist 2',
              entity_id: 'entity-2',
              version: 1,
              version_id: 'v2',
            }
          ];
          mockChecklist.findAll.mockResolvedValue(mockChecklists as any);
  
          // Act
          const result = await checklistService.listChecklists(programId);
  
          // Assert
          expect(mockChecklist.findAll).toHaveBeenCalledWith({
            where: {
              latest: true,
              is_enabled: true,
              program_id: programId,
            },
            order: [['name', 'ASC']],
            attributes: ['name', 'entity_id', 'version', 'version_id'],
          });
          expect(result).toEqual(mockChecklists);
        });
  
        it('should list checklists with name filter', async () => {
          // Arrange
          const name = 'test';
          const mockChecklists = [
            {
              name: 'Test Checklist',
              entity_id: 'entity-1',
              version: 1,
              version_id: 'v1',
            }
          ];
          mockChecklist.findAll.mockResolvedValue(mockChecklists as any);
  
          // Act
          const result = await checklistService.listChecklists(programId, name);
  
          // Assert
          expect(mockChecklist.findAll).toHaveBeenCalledWith({
            where: {
              latest: true,
              is_enabled: true,
              program_id: programId,
              name: expect.objectContaining({}),
            },
            order: [['name', 'ASC']],
            attributes: ['name', 'entity_id', 'version', 'version_id'],
          });
          expect(result).toEqual(mockChecklists);
        });
  
        it('should return empty array when no checklists found', async () => {
          // Arrange
          mockChecklist.findAll.mockResolvedValue([] as any);
  
          // Act
          const result = await checklistService.listChecklists(programId);
  
          // Assert
          expect(result).toEqual([]);
        });
      });
  
      describe('Edge Cases', () => {
        it('should handle empty string name filter', async () => {
          // Arrange
          const name = '';
          mockChecklist.findAll.mockResolvedValue([] as any);
  
          // Act
          const result = await checklistService.listChecklists(programId, name);
  
          // Assert
          expect(mockChecklist.findAll).toHaveBeenCalledWith({
            where: {
              latest: true,
              is_enabled: true,
              program_id: programId,
            },
            order: [['name', 'ASC']],
            attributes: ['name', 'entity_id', 'version', 'version_id'],
          });
        });
      });
    });
  }); 