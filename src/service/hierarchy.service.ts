import { FastifyRequest } from 'fastify';
import { sequelize } from '../config/instance';
import { hierarchie, masterDataQuery, getParentHierarchiesQuery, userData,getHierarchieWithChildren, getAllHierarchies, hierarchyDetailsQuery, parentHierarchyDetailsQuery, vendorMarkup, getMatchingHierarchiesQuery, getUserHierarchiesBasedOnUserType } from '../utility/queries';
import CountryModel from '../models/countries.model';
import { getCustomsField } from '../utility/get-custom-field';
import { parseValue } from '../utility/parse-value';
import Messages from '../language/en/message.language';
import { AppError } from '../utility/errorHandler';
import { hierarchiesData } from '../interfaces/hierarchies.interface';
import HierarchiesModel from '../models/hierarchies.model';
import HierarchyCustomFieldModel from '../models/hierarchies-custom-field.model';
import generateCustomUUID from '../utility/genrateTraceId';
import TenantModel from '../models/tenant.model';
import CustomField from '../models/custom-fields.model';
import { logger } from '../utility/loggerService';
import { Op, QueryTypes } from 'sequelize';

interface MasterDataResult {
  foundational_data: string | null;
  parent_hierarchy_name: string | null;
}

interface HierarchyQueryResult {
  id: string;
  name: string;
  address: any; 
  is_hide_candidate_img: number;
  is_vendor_neutral_program: number;
}

interface CreateHierarchyParams {
  programId: string;
  data: any;
  user: {
    sub: string;
    preferred_username?: string;
  };
  traceId: string;
}

interface HierarchyItem {
  support_email: any;
  default_date_format: any;
  default_currency: any;
  default_language: any;
  is_hide_candidate_img: any;
  is_vendor_neutral_program: any;
  default_timezone: any;
  id: string;
  parent_hierarchy_id: string | null;
  name: string;
  is_enabled: boolean;
  preferred_date_format: string;
  rate_model: string;
  created_on: number;
  updated_on: number;
  code: string;
  program_id: string;
  address: any;
}

interface Hierarchy {
  rate_model: string;
  id: string;
  name: string;
  parent_hierarchy_id: string | null;
  parent_name: string | null;
  hierarchies: Hierarchy[];
  is_assoiciate?: boolean;
}

export class HierarchyService {
  /**
   * Get hierarchy by ID with all related data
   * @param hierarchyId - The ID of the hierarchy to retrieve
   * @returns Promise<HierarchyData>
   */
  async getHierarchyById(hierarchyId: string): Promise<hierarchiesData> {
    try {

      const [hierarchy] = await sequelize.query<HierarchyQueryResult>(hierarchie, {
        replacements: { hierarchy_id: hierarchyId },
        type: QueryTypes.SELECT,
      });

      if (!hierarchy) {
        throw new AppError(Messages.HIERARCHIES_NOT_FOUND, 404);
      }

      const countryData = await this.getCountryData(hierarchy.address);

      const masterData = await this.getMasterData(hierarchyId);

      const customFields = await this.getCustomFields(hierarchyId);

      const transformedHierarchy = this.transformHierarchyData(
        hierarchy,
        countryData,
        masterData,
        customFields
      );

      return transformedHierarchy;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in getHierarchyById:', error);
      throw new AppError(Messages.HIERARCHIES_DATA_GET_BY_ID_ERROR, 500);
    }
  }

  /**
   * Get country data based on hierarchy address
   * @param address - Hierarchy address data
   * @returns Promise<any>
   */
  private async getCountryData(address: any): Promise<any> {
    if (!Array.isArray(address) || address.length === 0) {
      return { id: null, name: null, iso_code_2: null, isd_code: null, iso_code_3: null };
    }

    const countryId = address[0].country;
    if (!countryId) {
      return { id: null, name: null, iso_code_2: null, isd_code: null, iso_code_3: null };
    }

    const countryData = await CountryModel.findOne({
      where: { id: countryId },
      attributes: ["id", "name", "iso_code_2", "iso_code_3", "isd_code"],
    });

    return countryData || { id: null, name: null, iso_code_2: null, isd_code: null, iso_code_3: null };
  }

  /**
   * Get master data for hierarchy
   * @param hierarchyId - Hierarchy ID
   * @returns Promise<{foundational_data: any[], parent_hierarchy_name: string | null}>
   */
  private async getMasterData(hierarchyId: string): Promise<{foundational_data: any[], parent_hierarchy_name: string | null}> {
    const [masterDataResult] = await sequelize.query<MasterDataResult>(masterDataQuery, {
      replacements: { hierarchy_id: hierarchyId },
      type: QueryTypes.SELECT,
    });

    if (!masterDataResult) {
      return {
        foundational_data: [],
        parent_hierarchy_name: null
      };
    }

    const parsedData = typeof masterDataResult.foundational_data === 'string'
      ? JSON.parse(masterDataResult.foundational_data)
      : masterDataResult.foundational_data;

    const foundational_data = Array.isArray(parsedData)
      ? parsedData.filter(item => item.id !== null && item.name !== null)
      : [];

    return {
      foundational_data,
      parent_hierarchy_name: masterDataResult.parent_hierarchy_name ?? null
    };
  }

  /**
   * Get custom fields for hierarchy
   * @param hierarchyId - Hierarchy ID
   * @returns Promise<any[]>
   */
  private async getCustomFields(hierarchyId: string): Promise<any[]> {
    const [customFieldResult] = await sequelize.query(
      getCustomsField(hierarchyId, 'hierarchies_custom_field', 'hierarchy_id', 'customfield_id'),
      {
        replacements: { id: hierarchyId },
        type: QueryTypes.SELECT,
      }
    ) as any;

    if (!customFieldResult?.custom_fields) {
      return [];
    }

    return customFieldResult.custom_fields.map((field: any) => ({
      ...field,
      value: parseValue(field.value),
    }));
  }

  /**
   * Transform hierarchy data with all related information
   * @param hierarchy - Raw hierarchy data
   * @param countryData - Country information
   * @param masterData - Master data information
   * @param customFields - Custom fields data
   * @returns HierarchyData
   */
  private transformHierarchyData(
    hierarchy: any,
    countryData: any,
    masterData: {foundational_data: any[], parent_hierarchy_name: string | null},
    customFields: any[]
  ): hierarchiesData {
    return {
      ...hierarchy,
      is_hide_candidate_img: hierarchy.is_hide_candidate_img === 1 ? true : false,
      is_vendor_neutral_program: hierarchy.is_vendor_neutral_program === 1 ? true : false,
      country: countryData,
      foundational_data: masterData.foundational_data,
      parent_hierarchy_name: masterData.parent_hierarchy_name,
      custom_fields: customFields
    };
  }

  /**
   * Check if hierarchy exists
   * @param hierarchyId - Hierarchy ID
   * @returns Promise<boolean>
   */
  async hierarchyExists(hierarchyId: string): Promise<boolean> {
    try {
      const [hierarchy] = await sequelize.query<any>(hierarchie, {
        replacements: { hierarchy_id: hierarchyId },
        type: QueryTypes.SELECT,
      });
      return !!hierarchy;
    } catch (error) {
      console.error('Error checking hierarchy existence:', error);
      return false;
    }
  }

  /**
   * Get hierarchy basic info without related data
   * @param hierarchyId - Hierarchy ID
   * @returns Promise<any>
   */
  async getHierarchyBasicInfo(hierarchyId: string): Promise<any> {
    try {
      const [hierarchy] = await sequelize.query<any>(hierarchie, {
        replacements: { hierarchy_id: hierarchyId },
        type: QueryTypes.SELECT,
      });

      if (!hierarchy) {
        throw new AppError(Messages.HIERARCHIES_NOT_FOUND, 404);
      }

      return hierarchy;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in getHierarchyBasicInfo:', error);
      throw new AppError(Messages.HIERARCHIES_DATA_GET_BY_ID_ERROR, 500);
    }
  }

  /**
   * Get parent hierarchies by program_id
   * @param programId - The program ID to filter parent hierarchies
   * @returns Promise<any[]>
   */
  async getParentHierarchies(programId: string): Promise<any[]> {
    try {
      const parentHierarchies = await sequelize.query(getParentHierarchiesQuery, {
        replacements: { program_id: programId },
        type: QueryTypes.SELECT,
      });

      
      return parentHierarchies || [];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in getParentHierarchies:', error);
      throw new AppError(Messages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Get hierarchies by program with optional filtering and nested structure
   * @param programId - The program ID to filter hierarchies
   * @param id - Optional specific hierarchy ID to filter
   * @param isEnabled - Optional enabled status filter
   * @param mspId - Optional MSP ID filter
   * @returns Promise<any[]>
   */
  async getHierarchiesByProgram(
    programId: string,
    id?: string,
    isEnabled?: string,
    mspId?: string
  ): Promise<any[]> {
    try {
      
      const hierarchiesWithChildren: HierarchyItem[] = await sequelize.query(getHierarchieWithChildren, {
        replacements: {
          program_id: programId,
          managed_by: mspId || null
        },
        type: QueryTypes.SELECT
      });

      if (hierarchiesWithChildren.length === 0) {
        return [];
      }


      let filteredHierarchies = id
        ? hierarchiesWithChildren.filter((item) => item.id === id)
        : hierarchiesWithChildren;

      if (isEnabled !== undefined) {
        const isEnabledBoolean = isEnabled === 'true';
        filteredHierarchies = filteredHierarchies.filter((item) => {
          return Boolean(item.is_enabled) === isEnabledBoolean;
        });
      }

     
      const nestedHierarchy = this.buildHierarchyTree(filteredHierarchies);

      return nestedHierarchy;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(Messages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Build hierarchical tree structure from flat hierarchy data
   * @param data - Flat array of hierarchy items
   * @param parentId - Parent hierarchy ID (null for root level)
   * @returns Nested hierarchy array
   */
  private buildHierarchyTree(data: HierarchyItem[], parentId: string | null = null): any[] {
    return data
      .filter((item) => item.parent_hierarchy_id === parentId)
      .map((item) => {
        return {
          id: item.id,
          parent_hierarchy_id: item.parent_hierarchy_id,
          name: item.name,
          is_enabled: Boolean(item.is_enabled),
          preferred_date_format: item.preferred_date_format,
          rate_model: item.rate_model,
          created_on: item.created_on,
          updated_on: item.updated_on,
          code: item.code,
          program_id: item.program_id,
          default_timezone: item.default_timezone,
          is_hide_candidate_img: item.is_hide_candidate_img,
          default_language: item.default_language,
          default_currency: item.default_currency,
          default_date_format: item.default_date_format,
          support_email: item.support_email,
          is_vendor_neutral_program: Boolean(item.is_vendor_neutral_program),
          is_root_hierarchy: parentId === null,
          hierarchies: this.buildHierarchyTree(data, item.id),
        };
      });
  }

  /**
   * Get hierarchies with pagination and filtering
   * @param request - FastifyRequest object containing params and query
   * @returns Promise<{hierarchies: any[], totalRecords: number, page: number, limit: number}>
   */
  async getHierarchies(request: FastifyRequest): Promise<{hierarchies: any[], totalRecords: number, page: number, limit: number}> {
    try {
      const { program_id } = request.params as { program_id: string };
      const { name, is_enabled, updated_on, msp, page = 1, limit = 10 } = request.query as {
        name?: string;
        is_enabled?: boolean | string;
        updated_on?: string;
        msp?: string;
        page?: number;
        limit?: number;
      };

      const hasName = !!name;
      const hasMsp = !!msp;
      const isEnabledValue = is_enabled === "true" ? true : is_enabled === "false" ? false : undefined;

      let startDate: number | undefined;
      let endDate: number | undefined;

      if (updated_on) {
        const dateRange = updated_on.split(",").map((date: string) => date.trim());

        if (dateRange.length > 0 && !isNaN(Number(dateRange[0]))) {
          startDate = Number(dateRange[0]);
        }
        if (dateRange.length === 2 && !isNaN(Number(dateRange[1]))) {
          endDate = Number(dateRange[1]);
        }
      }

      const offset = (Number(page) - 1) * Number(limit);

      const replacements: any = {
        program_id,
        ...(hasName && { name: `%${name}%` }),
        ...(isEnabledValue !== undefined && { is_enabled: isEnabledValue }),
        ...(startDate && endDate && { startDate, endDate }),
        ...(hasMsp && { msp }),
        limit: Number(limit),
        offset: Number(offset),
      };

      const hierarchies: any[] = await sequelize.query(
        getAllHierarchies(hasName, !!is_enabled, startDate, endDate, hasMsp),
        {
          replacements,
          type: QueryTypes.SELECT,
        }
      );

      const totalCount = hierarchies[0]?.total_count || 0;

      if (totalCount === 0) {
        return {
          hierarchies: [],
          totalRecords: 0,
          page: Number(page),
          limit: Number(limit)
        };
      }

      const formattedHierarchies = hierarchies.map(
        ({ default_currency, total_count, ...rest }) => ({
          ...rest,
          currency: default_currency ?? null,
          is_vendor_neutral_program: Boolean(rest.is_vendor_neutral_program)
        })
      );

      return {
        hierarchies: formattedHierarchies,
        totalRecords: totalCount,
        page: Number(page),
        limit: Number(limit)
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(Messages.INTERNAL_SERVER_ERROR, 500);
    }
  }


 async createHierarchies(params: CreateHierarchyParams) {
    const { programId, data, user, traceId } = params;
    const transaction = await sequelize.transaction();

    try {
      
      const exists = await HierarchiesModel.findOne({
        where: { code: data.code, program_id: programId, is_deleted: false },
        transaction,
      });
      if (exists) throw new AppError(Messages.HIERARCHIES_CODE_ALREADY_IN_USE, 409);

     
      const hierarchy = await HierarchiesModel.create({
        ...data,
        program_id: programId,
        created_by: user.sub,
        updated_by: user.sub,
      }, { transaction });

    
      if (data.custom_fields?.length) {
        await HierarchyCustomFieldModel.bulkCreate(
          data.custom_fields.map((field: any) => ({
            program_id: programId,
            customfield_id: field.id,
            value: field.value,
            hierarchy_id: hierarchy.id,
          })),
          { transaction }
        );
      }

      await transaction.commit();
      
     
      logger({
        trace_id: traceId,
        actor: { user_name: user.preferred_username, user_id: user.sub },
        data,
        eventname: "created hierarchies",
        status: "success",
        description: `Created hierarchy ${hierarchy.id}`,
        level: "success",
        entity_id: programId,
      });

      return { id: hierarchy.id };
      
    } catch (error) {
      await transaction.rollback();
      
      logger({
        trace_id: traceId,
        actor: { user_name: user.preferred_username, user_id: user.sub },
        data,
        eventname: "creating hierarchies",
        status: "error",
        description: `Failed to create hierarchy`,
        level: "error",
        entity_id: programId,
      });

      throw error;
    }
  }

  /**
   * Update an existing hierarchy with custom fields
   * @param request - FastifyRequest object containing params, body, and user info
   * @returns Promise<void>
   */
  async updateHierarchies(request: FastifyRequest): Promise<void> {
    const { id, program_id } = request.params as { id: string; program_id: string };
    const hierarchiesData = request.body as hierarchiesData;
    const user = (request as any)?.user;
    const userId = user?.sub;

    const hierarchy = await HierarchiesModel.findOne({
      where: { id, program_id, is_deleted: false },
    });

    if (!hierarchy) {
      throw new AppError(Messages.HIERARCHY_NOT_FOUND, 200);
    }

    const transaction = await sequelize.transaction();
    try {
      if (hierarchy.parent_hierarchy_id === null) {
        const { is_enabled, parent_hierarchy_id, ...updatableData } = hierarchiesData;
        await hierarchy.update({ ...updatableData, updated_by: userId, updated_on: Date.now() }, { transaction });
      } else {
        await hierarchy.update({ ...hierarchiesData, updated_by: userId, updated_on: Date.now() }, { transaction });
      }

      if (hierarchiesData.custom_fields && hierarchiesData.custom_fields.length > 0) {
        await HierarchyCustomFieldModel.destroy({
          where: { hierarchy_id: hierarchy.id },
          transaction
        });
      }

      if (Array.isArray(hierarchiesData.custom_fields) && hierarchiesData.custom_fields.length > 0) {
        const customFields = hierarchiesData.custom_fields.map((field: { id: any; value: any; }) => ({
          program_id,
          customfield_id: field.id,
          value: field.value,
          hierarchy_id: hierarchy.id,
        }));
        await HierarchyCustomFieldModel.bulkCreate(customFields, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating hierarchy:', error);
      throw new AppError(Messages.FAILED_TO_UPDATE_HIERARCHIES, 500);
    }
  }

  /**
   * Get rate model for hierarchies
   * @param request - FastifyRequest object containing params and query
   * @returns Promise<{rate_model: string, hierarchies: Hierarchy[]}>
   */
  async getRateModel(request: FastifyRequest): Promise<{rate_model: string, hierarchies: Hierarchy[]}> {
    try {
      const { hierarchy_ids } = request.query as { hierarchy_ids: string };
      const { program_id } = request.params as { program_id: string };

      const hierarchyIdsArray = hierarchy_ids.split(',');
      const hierarchyDetailsResult = await sequelize.query(hierarchyDetailsQuery, {
        replacements: {
          hierarchyIds: hierarchyIdsArray,
          programId: program_id,
        },
        type: QueryTypes.SELECT,
      });

      if (hierarchyDetailsResult.length === 0) {
        return {
          rate_model: "No Rate Model Available",
          hierarchies: []
        };
      }

      const hierarchyDetails: Hierarchy[] = hierarchyDetailsResult.map((item: any) => ({
        id: item.id,
        name: item.name,
        parent_hierarchy_id: item.parent_hierarchy_id,
        parent_name: item.parent_name,
        rate_model: item.rate,
        is_assoiciate: hierarchyIdsArray.includes(item.id),
        hierarchies: [],
      }));

      const parentHierarchyIds = hierarchyDetails
        .map(h => h.parent_hierarchy_id)
        .filter((id, index, self) => id && self.indexOf(id) === index && !hierarchyIdsArray.includes(id));

      let parentHierarchyDetails: Hierarchy[] = [];
      if (parentHierarchyIds.length > 0) {
        const parentHierarchyDetailsResult = await sequelize.query(parentHierarchyDetailsQuery, {
          replacements: {
            parentHierarchyIds,
            programId: program_id,
          },
          type: QueryTypes.SELECT,
        });

        parentHierarchyDetails = parentHierarchyDetailsResult.map((item: any) => ({
          id: item.id,
          name: item.name,
          parent_hierarchy_id: item.parent_hierarchy_id,
          parent_name: item.parent_name,
          rate_model: item.rate,
          is_assoiciate: false,
          hierarchies: []
        }));
      }

      const allHierarchies = [...hierarchyDetails, ...parentHierarchyDetails];

      const hierarchyTree = this.buildHierarchyTreeForRateModel(allHierarchies);
      const rateModels = hierarchyDetails.map(h => h.rate_model);
      const uniqueRateModels = Array.from(new Set(rateModels));

      const finalRateModel = uniqueRateModels.length === 1
        ? uniqueRateModels[0]
        : this.findParentRateModel(hierarchyTree) ?? "No Rate Model Available";

      return {
        rate_model: finalRateModel,
        hierarchies: hierarchyTree
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(Messages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Find parent rate model from hierarchy tree
   * @param hierarchyTree - Array of hierarchy nodes
   * @returns string | null
   */
  private findParentRateModel(hierarchyTree: Hierarchy[]): string | null {
    let parentRateModel: string | null = null;

    const traverse = (node: Hierarchy) => {
      if (node.rate_model) {
        if (!parentRateModel) {
          parentRateModel = node.rate_model;
        }
      }
      node.hierarchies.forEach(traverse);
    };

    hierarchyTree.forEach(traverse);
    return parentRateModel;
  }

  /**
   * Build hierarchy tree for rate model (different from regular hierarchy tree)
   * @param hierarchies - Array of hierarchy items
   * @returns Hierarchy[]
   */
  private buildHierarchyTreeForRateModel(hierarchies: Hierarchy[]): Hierarchy[] {
    const map: { [key: string]: Hierarchy } = {};
    const roots: Hierarchy[] = [];
    hierarchies.forEach(hierarchy => {
      map[hierarchy.id] = { ...hierarchy, hierarchies: [] };
    });
    hierarchies.forEach(hierarchy => {
      if (hierarchy.parent_hierarchy_id) {
        const parent = map[hierarchy.parent_hierarchy_id];
        if (parent) {
          parent.hierarchies.push(map[hierarchy.id]);
        } else {
          roots.push(map[hierarchy.id]);
        }
      } else {
        roots.push(map[hierarchy.id]);
      }
    });
    return roots;
  }



async getHierarchiesAdvancedFilter(request: FastifyRequest) {
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, updated_on, page = 1, limit = 10 } = request.body as {
    name?: string;
    is_enabled?: boolean | string;
    updated_on?: number[];
    page?: number;
    limit?: number;
  };

  const hasName = !!name;
  const isEnabledValue =
    is_enabled === "true" ? true : is_enabled === "false" ? false : undefined;
  const { updated_on: updatedOnArr } = request.body as { updated_on: number[] };

  let startDate: number | undefined;
  let endDate: number | undefined;
  if (Array.isArray(updatedOnArr) && updatedOnArr.length === 2) {
    const parsedStartDate = Number(updatedOnArr[0]);
    const parsedEndDate = Number(updatedOnArr[1]);
    if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate)) {
      startDate = parsedStartDate;
      endDate = parsedEndDate;
    }
  }

  const offset = (page - 1) * limit;

  const replacements: any = {
    program_id,
    ...(hasName && { name: `%${name}%` }),
    ...(isEnabledValue !== undefined && { is_enabled: isEnabledValue }),
    ...(startDate !== undefined && endDate !== undefined && { startDate, endDate }),
    limit: Number(limit),
    offset: Number(offset),
  };

  const hierarchies: any[] = await sequelize.query(
    getAllHierarchies(hasName, !!is_enabled, startDate, endDate),
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  );

  if (hierarchies.length === 0) {
    return {
      total_records: 0,
      page,
      limit,
      hierarchies: [],
    };
  }

  const formattedHierarchies = hierarchies.map((hierarchy) => ({
    ...hierarchy,
    is_vendor_neutral_program: Boolean(hierarchy.is_vendor_neutral_program),
  }));
  const total_count = hierarchies[0]?.total_count || 0;

  return {
    total_records: total_count,
    page,
    limit,
    hierarchies: formattedHierarchies,
  };
}




async getMspByClient(program_id: string, client_id?: string, hierarchy_id?: string) {
  if (!client_id && !hierarchy_id) {
    throw new AppError(Messages.CLIENT_OR_HIERARCHY_ID_REQUIRED, 400);
  }

  let managedByIds: string[] = [];

  if (hierarchy_id) {
    const hierarchy = await HierarchiesModel.findOne({
      where: {
        id: hierarchy_id,
        program_id,
        is_enabled: true,
      },
      attributes: ["managed_by"],
      raw: true,
    });

    if (!hierarchy) {
      throw new AppError(Messages.HIERARCHY_NOT_FOUND, 404);
    }

    managedByIds = [hierarchy.managed_by];
  } else {
    const [user]: any = await sequelize.query(userData, {
      replacements: { client_id, program_id },
      type: QueryTypes.SELECT,
    });

    if (!user) {
      throw new AppError(Messages.USER_NOT_FOUND, 404);
    }

    const { associate_hierarchy_ids, is_all_hierarchy_associate, user_type } = user;

    if (is_all_hierarchy_associate || user_type === "super_user") {
      const hierarchies = await HierarchiesModel.findAll({
        where: {
          program_id,
          is_enabled: true,
        },
        attributes: ["managed_by"],
        raw: true,
      });

      managedByIds = [...new Set(hierarchies.map((h: any) => h.managed_by))];
    } else {
      const hierarchies = await HierarchiesModel.findAll({
        where: {
          id: associate_hierarchy_ids,
          program_id,
          is_enabled: true,
        },
        attributes: ["managed_by"],
        raw: true,
      });

      managedByIds = [...new Set(hierarchies.map((h: any) => h.managed_by))];
    }
  }

  const isSelfManagedPresent = managedByIds.includes("self-managed");

  const tenants = await TenantModel.findAll({
    where: {
      id: managedByIds.filter((id) => id !== "self-managed"),
    },
    attributes: ["id", "name", "display_name"],
  });

  if (isSelfManagedPresent) {
    tenants.unshift({
      id: "self-managed",
      name: "SELF_MANAGED",
      display_name: "SELF MANAGED",
    } as any);
  }

  return tenants;
}

  /**
   * Get vendor markup for hierarchies
   * @param request - FastifyRequest object containing params and query
   * @returns Promise<{rate_model: any, markup?: any, markups?: any, message?: string}>
   */
  async getVendorMarkup(request: FastifyRequest): Promise<{rate_model: any, markup?: any, markups?: any, message?: string}> {
    try {
      const { program_id } = request.params as { program_id: string };
      const {
        candidate_source,
        hierarchy_id,
        vendor_id,
        labour_category_id,
      } = request.query as {
        candidate_source: string;
        hierarchy_id: string;
        vendor_id: string;
        labour_category_id: string;
      };

      const rateModelResult = await sequelize.query<{ rate_model: any }>(
        `SELECT rate_model FROM hierarchies WHERE id = :hierarchy_id`,
        {
          replacements: { hierarchy_id },
          type: QueryTypes.SELECT,
        }
      );

      const rateModel = rateModelResult.length > 0 ? rateModelResult[0].rate_model : null;
      let rate_model;
      if (rateModel === "bill_rate" || rateModel === "markup") {
        rate_model = "bill_rate";
      } else {
        rate_model = rateModel;
      }

      const [markupsData] = await sequelize.query<{ markups: any }>(vendorMarkup, {
        replacements: {
          program_id,
          vendor_id,
          rateModel: rate_model,
          program_industry: labour_category_id,
          hierarchy_id
        },
        type: QueryTypes.SELECT,
      });

      let selectedMarkup: any = null;

      if (markupsData) {
        const { markups } = markupsData;

        if (candidate_source === "sourced") {
          selectedMarkup = markups?.sourced_markup;
        } else if (candidate_source === "payrolled") {
          selectedMarkup = markups?.payrolled_markup;
        } else {
          selectedMarkup = null;
        }
      }

      if (!selectedMarkup) {
        return {
          rate_model: rateModel,
          markups: null,
          message: `No ${candidate_source}_markup found for the provided criteria`
        };
      }

      return {
        rate_model: rateModel,
        markup: selectedMarkup
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(error);
      throw new AppError(Messages.FAILED_TO_RETRIEVE_VENDOR_MARKUP, 500);
    }
  }

  /**
   * Update is_not_editable flag for hierarchies
   * @param request - FastifyRequest object containing params and query
   * @returns Promise<{updated_hierarchy_ids: string[]}>
   */
  async updateIsNotEditableFlag(request: FastifyRequest): Promise<{updated_hierarchy_ids: string[]}> {
    try {
      const { hierarchy_ids } = request.query as { hierarchy_ids: string };
      const { program_id } = request.params as { program_id: string };

      if (!hierarchy_ids) {
        throw new AppError(Messages.MISSING_HIERARCHY_IDS_PARAMETER, 400);
      }

      const hierarchyIdsArray = hierarchy_ids.split(',');
      const query = getMatchingHierarchiesQuery();
      const matchedHierarchies: { hierarchy_id: string }[] = await sequelize.query(query, {
        replacements: { program_id, hierarchy_ids: hierarchyIdsArray },
        type: QueryTypes.SELECT
      });

      if (!matchedHierarchies.length) {
        throw new AppError(Messages.NO_MATCHING_HIERARCHIES_FOUND, 200);
      }

      const matchedHierarchyIds = matchedHierarchies.map((h) => h.hierarchy_id);
      await sequelize.query(
        `UPDATE hierarchies SET is_not_editable = TRUE WHERE id IN (:matchedHierarchyIds)`,
        { replacements: { matchedHierarchyIds }, type: QueryTypes.UPDATE }
      );

      return {
        updated_hierarchy_ids: matchedHierarchyIds
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(Messages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Get user hierarchies based on user type and permissions
   * @param request - FastifyRequest object containing params and user info
   * @returns Promise<any[]>
   */
  async getUserHierarchies(request: FastifyRequest): Promise<any[]> {
    try {
      const user = (request as any)?.user;
      const userId = user.sub;
      const userType = user.userType;
      const { program_id } = request.params as { program_id: string };

      let hierarchies: any[] = [];

      if (userType === "super_user") {
        hierarchies = await HierarchiesModel.findAll({
          where: { program_id, is_deleted: false },
          attributes: ["id", "name", "parent_hierarchy_id", "is_enabled"],
        });
      } else {
        hierarchies = await sequelize.query(getUserHierarchiesBasedOnUserType, {
          replacements: { userId, program_id },
          type: QueryTypes.SELECT,
        });
      }

      const nestedHierarchy = this.buildUserHierarchyTree(hierarchies);
      return nestedHierarchy;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(Messages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  async bulkCreateHierarchies(
    program_id: string,
    hierarchiesData: hierarchiesData[],
    user: any,
    request: any
  ) {
    if (!Array.isArray(hierarchiesData) || hierarchiesData.length === 0) {
      throw new AppError(Messages.BAD_REQUEST_EXPECTED_ARRAY, 400);
    }

    const userId = user?.sub;
    const transaction = await sequelize.transaction();
    const results = {
      successful: [] as any[],
      failed: [] as any[],
      duplicates: [] as any[]
    };

    try {
      const hierarchyCodes = hierarchiesData.map(h => h.code);

      const existingCodes = await HierarchiesModel.findAll({
        where: {
          code: { [Op.in]: hierarchyCodes },
          program_id,
          is_deleted: false
        },
        attributes: ['code'],
        transaction,
      });

      const existingCodesSet = new Set(existingCodes.map(item => item.code));

      for (let i = 0; i < hierarchiesData.length; i++) {
        const hierarchie = hierarchiesData[i];
        const hierarchyCode = hierarchie.code;

        try {
          if (existingCodesSet.has(hierarchyCode)) {
            results.duplicates.push({
              index: i,
              code: hierarchyCode,
              message: "Hierarchy code already exists"
            });
            continue;
          }

          if (hierarchie.rate_model) {
            const rateModelMap: Record<string, 'bill_rate' | 'markup' | 'pay_rate'> = {
              'Bill Rate (No Markup)': 'bill_rate',
              'Bill Rate (Markup)': 'markup',
              'Pay Rate (Markup)': 'pay_rate'
            };

            const normalizedRateModel = rateModelMap[hierarchie.rate_model];
            if (normalizedRateModel) {
              hierarchie.rate_model = normalizedRateModel;
            } else {
              results.failed.push({
                index: i,
                code: hierarchyCode,
                message: `Invalid rate_model: '${hierarchie.rate_model}'`
              });
              continue;
            }
          }

          let managedById = null;
          if (hierarchie.managed_by) {
            const managedByUser = await TenantModel.findOne({
              where: {
                display_name: hierarchie.managed_by
              },
              attributes: ['id'],
              transaction
            });

            if (managedByUser) {
              managedById = managedByUser.id;
            } else {
              results.failed.push({
                index: i,
                code: hierarchyCode,
                message: `Invalid managed_by: '${hierarchie.managed_by}' not found`
              });
              continue;
            }
          }
          let parentHierarchyId = null;
          if (hierarchie.parent_hierarchy_name && hierarchie.parent_hierarchy_code) {
            const parentHierarchy = await HierarchiesModel.findOne({
              where: {
                name: hierarchie.parent_hierarchy_name,
                code: hierarchie.parent_hierarchy_code,
                program_id,
                is_deleted: false
              },
              attributes: ['id'],
              transaction
            });

            if (parentHierarchy) {
              parentHierarchyId = parentHierarchy.id;
            } else {
              results.failed.push({
                index: i,
                code: hierarchyCode,
                message: `Invalid parent_hierarchy: name='${hierarchie.parent_hierarchy_name}', code='${hierarchie.parent_hierarchy_code}' not found`
              });
              continue;
            }
          }

          const newItem = await HierarchiesModel.create(
            {
              ...hierarchie,
              program_id,
              created_by: userId,
              updated_by: userId,
              managed_by: managedById,
              parent_hierarchy_id: parentHierarchyId,
            },
            { transaction }
          );

          if (Array.isArray(hierarchie.custom_fields) && hierarchie.custom_fields.length > 0) {
            const customFieldNames = hierarchie.custom_fields.map((field: { name: any; value: any }) => field.name);

            const customFieldsFromDB = await CustomField.findAll({
              where: {
                name: { [Op.in]: customFieldNames },
                program_id
              },
              attributes: ['id', 'name'],
              transaction
            });

            const customFieldMap = new Map();
            customFieldsFromDB.forEach((cf: { name: any; id: any; }) => {
              customFieldMap.set(cf.name, cf.id);
            });

            const validCustomFields = [];
            const invalidCustomFields = [];

            for (const field of hierarchie.custom_fields) {
              const customFieldId = customFieldMap.get(field.name);

              if (customFieldId) {
                validCustomFields.push({
                  program_id,
                  customfield_id: customFieldId,
                  value: field.value,
                  hierarchy_id: newItem.id,
                });
              } else {
                invalidCustomFields.push(field.name);
              }
            }
            if (validCustomFields.length > 0) {
              await HierarchyCustomFieldModel.bulkCreate(validCustomFields, { transaction });
            }
          }
          existingCodesSet.add(hierarchyCode);

          results.successful.push({
            index: i,
            id: newItem.id,
            code: hierarchyCode,
            message: "Created successfully"
          });

        } catch (itemError) {
          results.failed.push({
            index: i,
            code: hierarchyCode,
            message: (itemError as any).message,
            error: itemError
          });
        }
      }

      await transaction.commit();

      return {
        summary: {
          total: hierarchiesData.length,
          successful: results.successful.length,
          failed: results.failed.length,
          duplicates: results.duplicates.length
        },
        results
      };

    } catch (error) {
      await transaction.rollback();
      throw new AppError(Messages.FAILED_TO_BULK_CREATE_HIERARCHIES, 500);
    }
  }


  /**
   * Build hierarchy tree for user hierarchies (different structure than other hierarchy trees)
   * @param data - Array of hierarchy items
   * @param parentId - Parent hierarchy ID (null for root level)
   * @returns Nested hierarchy array
   */
  private buildUserHierarchyTree(data: any, parentId: string | null = null): any[] {
    return data
      .filter((item: any) => item.parent_hierarchy_id === parentId)
      .map((item: any) => {
        const children = this.buildUserHierarchyTree(data, item.id);
        return {
          id: item.id,
          parent_hierarchy_id: item.parent_hierarchy_id,
          name: item.name,
          is_enabled: item.is_enabled,
          is_root_hierarchy: item.parent_hierarchy_id === null,
          hierarchies: children,
        };
      });
  }
}

export default HierarchyService;
