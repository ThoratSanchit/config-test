import rateType from "../models/rate-type.model";
import { CreateRateTypeData, RateTypeInterface } from "../interfaces/rate-type-interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes, Sequelize } from "sequelize";
import { logger } from '../utility/loggerService';
import { sequelize } from "../config/instance";
import { getAllRateTypes, rateTypeShiftAndRate, rateTypeAdvanceFilter } from "../utility/queries";

interface ServiceResponse {
  success: boolean;
  status_code: number;
  message: string;
  trace_id: string;
  data?: any;
  error?: any;
  total_records?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
}

interface UserInfo {
  preferred_username?: string;
  sub: string;
}

export class RateTypeService {
  
  // Helper function to parse boolean values
  private parseBoolean(value: any): number | undefined {
    if (typeof value === "string") {
      return value.toLowerCase() === "true" ? 1 : value.toLowerCase() === "false" ? 0 : undefined;
    }
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }
    return undefined;
  }

  // Helper function to parse date range
  private parseDateRange(updated_on: string): { startDate?: number; endDate?: number } {
    if (!updated_on) return {};

    const [startDateStr, endDateStr] = updated_on.split(",").map(v => v.trim());

    let startMs: number | undefined;
    let endMs: number | undefined;

    if (startDateStr) {
      const startDate = new Date(Number(startDateStr));
      startDate.setHours(0, 0, 0, 0);
      startMs = startDate.getTime();
    }

    if (endDateStr) {
      const endDate = new Date(Number(endDateStr));
      endDate.setHours(23, 59, 59, 999);
      endMs = endDate.getTime();
    } else if (startMs) {
      const endDate = new Date(Number(startDateStr));
      endDate.setHours(23, 59, 59, 999);
      endMs = endDate.getTime();
    }

    return {
      ...(startMs !== undefined && { startDate: startMs }),
      ...(endMs !== undefined && { endDate: endMs }),
    };
  }

  // Helper function to get query parameters
  private getQueryParams(query: any) {
    const {
      id,
      name,
      is_enabled,
      updated_on,
      is_shift_rate,
      is_base_rate,
      differential_on,
      rate_type_category,
      shift_type,
      rate_type_category_label,
      abbreviation,
      page = "1",
      limit = "10",
      hierarchy_ids,
    } = query;

    return {
      id,
      name,
      differential_on,
      rate_type_category,
      shift_type,
      abbreviation,
      rateTypeCategoryLabels: rate_type_category_label ? rate_type_category_label.split(",") : [],
      hasName: !!name,
      hasId: !!id,
      isEnabledValue: this.parseBoolean(is_enabled),
      isShiftRateValue: this.parseBoolean(is_shift_rate),
      isBaseRate: this.parseBoolean(is_base_rate),
      hasDifferentialOn: !!differential_on,
      hasRateTypeCategory: !!rate_type_category,
      hasShiftType: !!shift_type,
      hasAbbreviation: !!abbreviation,
      hasHierarchies: !!hierarchy_ids,
      hierarchyIdsArray: hierarchy_ids ? hierarchy_ids.split(",") : [],
      ...this.parseDateRange(updated_on),
      pageNumber: parseInt(page, 10),
      pageSize: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      hasHierarchyShiftFilter: !!hierarchy_ids,
    };
  }

  // Helper function to fetch rate types
  private async fetchRateTypes(queryParams: any, program_id: string): Promise<any[]> {
    try {
      // Build the query using the getAllRateTypes function
      const query = getAllRateTypes(
        queryParams.hasName,
        queryParams.hasId,
        queryParams.isEnabledValue !== undefined,
        queryParams.isShiftRateValue !== undefined,
        queryParams.isBaseRate !== undefined,
        queryParams.hasDifferentialOn,
        queryParams.hasRateTypeCategory,
        queryParams.hasShiftType,
        queryParams.hasRateTypeCategoryLabels,
        queryParams.hasAbbreviation,
        queryParams.startDate,
        queryParams.endDate,
        queryParams.pageSize,
        queryParams.offset,
        queryParams.hasHierarchyShiftFilter
      );

      const replacements: any = {
        program_id,
        limit: queryParams.pageSize,
        offset: queryParams.offset,
      };

      // Add conditional replacements based on what parameters are present
      if (queryParams.hasName && queryParams.name) {
        replacements.name = `%${queryParams.name}%`;
      }
      if (queryParams.hasId && queryParams.id) {
        replacements.id = queryParams.id;
      }
      if (queryParams.hasRateTypeCategory && queryParams.rate_type_category) {
        replacements.rate_type_category = queryParams.rate_type_category;
      }
      if (queryParams.hasShiftType && queryParams.shift_type) {
        replacements.shift_type = queryParams.shift_type;
      }
      if (queryParams.hasAbbreviation && queryParams.abbreviation) {
        replacements.abbreviation = `%${queryParams.abbreviation}%`;
      }
      if (queryParams.isEnabledValue !== undefined) {
        replacements.is_enabled = queryParams.isEnabledValue;
      }
      if (queryParams.isBaseRate !== undefined) {
        replacements.is_base_rate = queryParams.isBaseRate;
      }
      if (queryParams.isShiftRateValue !== undefined) {
        replacements.is_shift_rate = queryParams.isShiftRateValue;
      }
      if (queryParams.startDate) {
        replacements.start_date = queryParams.startDate;
      }
      if (queryParams.endDate) {
        replacements.end_date = queryParams.endDate;
      }
      if (queryParams.hasHierarchyShiftFilter && queryParams.hierarchyIdsArray) {
        replacements.hierarchy_ids = queryParams.hierarchyIdsArray;
      }

      const results = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      console.error('Error fetching rate types:', error);
      throw error;
    }
  }

  async createRateType(
    data: CreateRateTypeData,
    program_id: string,
    user: UserInfo,
    requestMethod: string,
    requestUrl: string
  ): Promise<ServiceResponse> {
    const { name, rate, rate_type_category } = data;
    const trace_id = generateCustomUUID();

    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: data,
        eventname: "Creating rate type config",
        status: "success",
        description: `Creating rate type for ${program_id}`,
        level: "info",
        action: requestMethod,
        url: requestUrl,
        entity_id: program_id,
        is_deleted: false,
      },
      rateType
    );

    try {
      // Check if rate type with same name already exists
      const existingRateTypeWithSameName = await rateType.findOne({
        where: { name, program_id },
      });

      if (existingRateTypeWithSameName) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: data,
            eventname: "creating rate type",
            status: "error",
            description: `Rate type with name ${name} already exists for program ${program_id}`,
            level: "error",
            action: requestMethod,
            url: requestUrl,
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );

        return {
          success: false,
          status_code: 400,
          message: "A rate type with this name already exists.",
          trace_id,
        };
      }

      // Check if rate type with same base differential already exists
      if (rate?.base_differential_on) {
        const existingRateTypeWithSameBaseDifferential = await rateType.findOne({
          where: {
            rate_type_category,
            program_id,
            is_deleted: false,
            [Op.and]: Sequelize.literal(
              `JSON_EXTRACT(rate, '$.base_differential_on') = '${rate.base_differential_on}'`
            ),
          },
        });

        if (existingRateTypeWithSameBaseDifferential) {
          logger(
            {
              trace_id,
              actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
              },
              data: data,
              eventname: "creating rate type",
              status: "error",
              description: `Rate type with the same rate_type_category and base_differential_on already exists for program ${program_id}`,
              level: "error",
              action: requestMethod,
              url: requestUrl,
              entity_id: program_id,
              is_deleted: false,
            },
            rateType
          );

          return {
            success: false,
            status_code: 400,
            message: "A rate type with the same category and base differential already exists.",
            trace_id,
          };
        }
      }

      // Create the rate type
      const item = await rateType.create({
        ...data,
        program_id,
        created_by: user.sub,
        updated_by: user.sub,
      });

      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: data,
          eventname: "creating rate type",
          status: "success",
          description: `Rate type created successfully for program ${program_id}`,
          level: "success",
          action: requestMethod,
          url: requestUrl,
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );

      return {
        success: true,
        status_code: 201,
        message: "Rate Type created successfully.",
        trace_id,
        data: { id: item.id },
      };

    } catch (error: any) {
      if (error.name === "SequelizeUniqueConstraintError") {
        const field = error.errors[0].path;
        return {
          success: false,
          status_code: 400,
          message: `${field} already in use!`,
          trace_id,
        };
      }

      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: data,
          eventname: "creating rate type",
          status: "error",
          description: `Error creating rate type for program ${program_id}`,
          level: "error",
          action: requestMethod,
          url: requestUrl,
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );

      return {
        success: false,
        status_code: 500,
        message: "Internal server error",
        trace_id,
        error,
      };
    }
  }

  async getAllRateTypes(
    queryParams: RateTypeInterface,
    program_id: string
  ): Promise<ServiceResponse> {
    const traceId = generateCustomUUID();

    try {
      const processedQueryParams = this.getQueryParams(queryParams);
      const rateTypes = await this.fetchRateTypes(processedQueryParams, program_id);
      const totalCount = rateTypes[0]?.total_records ?? 0;

      return {
        success: true,
        status_code: 200,
        trace_id: traceId,
        message: rateTypes.length ? "Rate type fetched successfully." : "No rate type found for the given program",
        total_records: totalCount,
        page: processedQueryParams.pageNumber,
        limit: processedQueryParams.pageSize,
        total_pages: Math.ceil(totalCount / processedQueryParams.pageSize),
        data: rateTypes,
      };

    } catch (error: any) {
      return {
        success: false,
        status_code: 500,
        trace_id: traceId,
        message: "Internal server error",
        error: error.message,
      };
    }
  }

  async updateRateTypeById(
    id: string,
    program_id: string,
    updates: CreateRateTypeData,
    user: UserInfo,
    requestMethod: string,
    requestUrl: string
  ): Promise<ServiceResponse> {
    const trace_id = generateCustomUUID();

    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: { id, program_id, updates },
        eventname: "Updating rate type",
        status: "info",
        description: `Updating rate type ${id} for program ${program_id}`,
        level: "info",
        action: requestMethod,
        url: requestUrl,
        entity_id: program_id,
        is_deleted: false,
      },
      rateType
    );

    try {
      // Check if rate type exists and is not deleted
      const existingRateType = await rateType.findOne({
        where: {
          id,
          program_id,
          is_deleted: false,
        },
      });

      if (!existingRateType) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: { id, program_id },
            eventname: "updating rate type",
            status: "error",
            description: `Rate type ${id} not found for program ${program_id}`,
            level: "error",
            action: requestMethod,
            url: requestUrl,
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );

        return {
          success: false,
          status_code: 404,
          message: "Rate type not found",
          trace_id,
        };
      }

      // Check for name uniqueness if name is being updated
      if (updates.name) {
        const existingRateTypeWithSameName = await rateType.findOne({
          where: {
            name: updates.name,
            program_id,
            id: { [Op.ne]: id },
            is_deleted: false,
          },
        });

        if (existingRateTypeWithSameName) {
          logger(
            {
              trace_id,
              actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
              },
              data: { name: updates.name, program_id },
              eventname: "updating rate type",
              status: "error",
              description: `Rate type with name ${updates.name} already exists for program ${program_id}`,
              level: "error",
              action: requestMethod,
              url: requestUrl,
              entity_id: program_id,
              is_deleted: false,
            },
            rateType
          );

          return {
            success: false,
            status_code: 400,
            message: "A rate type with this name already exists.",
            trace_id,
          };
        }
      }

      // Update the rate type
      await rateType.update(
        {
          ...updates,
          updated_on: Date.now(),
          updated_by: user.sub,
        },
        { where: { id, program_id } }
      );

      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: { id, program_id, updates },
          eventname: "updating rate type",
          status: "success",
          description: `Rate type ${id} updated successfully for program ${program_id}`,
          level: "info",
          action: requestMethod,
          url: requestUrl,
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );

      return {
        success: true,
        status_code: 200,
        message: "Rate type updated successfully",
        trace_id,
      };

    } catch (error: any) {
      if (error.name === "SequelizeUniqueConstraintError") {
        const field = error.errors[0].path;
        return {
          success: false,
          status_code: 400,
          message: `${field} already in use!`,
          trace_id,
        };
      }

      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: { id, program_id, updates },
          eventname: "updating rate type",
          status: "error",
          description: `Error updating rate type ${id} for program ${program_id}`,
          level: "error",
          action: requestMethod,
          url: requestUrl,
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );

      return {
        success: false,
        status_code: 500,
        message: "Internal server error",
        trace_id,
        error,
      };
    }
  }

  async getDifferentialOnForRateType(
    program_id: string,
    is_shift_rate?: string,
    user?: UserInfo,
    requestMethod?: string,
    requestUrl?: string
  ): Promise<ServiceResponse> {
    const trace_id = generateCustomUUID();

    // Log the request
    if (user) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: { program_id, is_shift_rate },
          eventname: "Getting differential on for rate type",
          status: "info",
          description: `Retrieving differential on data for program ${program_id}`,
          level: "info",
          action: requestMethod || "GET",
          url: requestUrl || "",
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );
    }

    try {
      // Build where conditions for rate type query
      const whereConditions: any = {
        program_id,
        is_enabled: true,
        is_deleted: false,
      };

      // Fetch rate types with specific attributes
      const rateTypes = await rateType.findAll({
        where: whereConditions,
        attributes: ["id", "name", "is_base_rate", "is_shift_rate"],
      });

      // Process rate types to categorize them
      let standard = null;
      const shift: { id: string; name: string }[] = [];

      rateTypes.forEach((rate: any) => {
        if (rate.is_base_rate && !rate.is_shift_rate) {
          // Standard rate type (base rate but not shift rate)
          standard = {
            id: rate.id,
            name: rate.name,
          };
        } else if (rate.is_base_rate && rate.is_shift_rate) {
          // Shift rate type (base rate and shift rate)
          shift.push({
            id: rate.id,
            name: rate.name,
          });
        }
      });

      // Determine response data based on is_shift_rate parameter
      const responseData = is_shift_rate === "false"
        ? { standard }
        : { standard, shift };

      // Log successful operation
      if (user) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: { program_id, is_shift_rate, resultCount: rateTypes.length },
            eventname: "getting differential on for rate type",
            status: "success",
            description: `Successfully retrieved differential on data for program ${program_id}`,
            level: "info",
            action: requestMethod || "GET",
            url: requestUrl || "",
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );
      }

      return {
        success: true,
        status_code: 200,
        message: "Rate type get successfully",
        trace_id,
        data: responseData,
      };

    } catch (error: any) {
      // Log error
      if (user) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: { program_id, is_shift_rate },
            eventname: "getting differential on for rate type",
            status: "error",
            description: `Error retrieving differential on data for program ${program_id}`,
            level: "error",
            action: requestMethod || "GET",
            url: requestUrl || "",
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );
      }

      return {
        success: false,
        status_code: 500,
        message: "Failed to retrieve rate type",
        trace_id,
        error: error.message,
      };
    }
  }

  async getShiftAndRateType(
    program_id: string,
    user?: UserInfo,
    requestMethod?: string,
    requestUrl?: string
  ): Promise<ServiceResponse> {
    const trace_id = generateCustomUUID();

    // Log the request
    if (user) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: { program_id },
          eventname: "Getting shift and rate type data",
          status: "info",
          description: `Retrieving shift and rate type data for program ${program_id}`,
          level: "info",
          action: requestMethod || "GET",
          url: requestUrl || "",
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );
    }

    try {
      // Execute the query to get shift and rate type data
      const results = await sequelize.query(rateTypeShiftAndRate, {
        replacements: { program_id },
        type: QueryTypes.SELECT,
      });

      // Filter and map shift types
      const shiftTypes = results
        .filter((result: any) => result.shift_id && result.shift_name)
        .map((result: any) => ({
          id: result.shift_id,
          name: result.shift_name,
        }));

      // Filter and map rate type categories
      const rateTypeCategories = results
        .filter((result: any) => result.rate_type_id && result.rate_type_value)
        .map((result: any) => ({
          id: result.rate_type_id,
          name: result.rate_type_value,
        }));

      // Prepare response data
      const responseData = {
        shift_type: shiftTypes,
        rate_type_category: rateTypeCategories,
      };

      // Log successful operation
      if (user) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: {
              program_id,
              shiftTypesCount: shiftTypes.length,
              rateTypeCategoriesCount: rateTypeCategories.length
            },
            eventname: "getting shift and rate type data",
            status: "success",
            description: `Successfully retrieved shift and rate type data for program ${program_id}`,
            level: "info",
            action: requestMethod || "GET",
            url: requestUrl || "",
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );
      }

      return {
        success: true,
        status_code: 200,
        message: "Shift and rate type data retrieved successfully",
        trace_id,
        data: responseData,
      };

    } catch (error: any) {
      // Log error
      if (user) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: { program_id },
            eventname: "getting shift and rate type data",
            status: "error",
            description: `Error retrieving shift and rate type data for program ${program_id}`,
            level: "error",
            action: requestMethod || "GET",
            url: requestUrl || "",
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );
      }

      return {
        success: false,
        status_code: 500,
        message: "Failed to retrieve shift and rate type data",
        trace_id,
        error: error.message,
      };
    }
  }

  async rateTypeFilter(
    program_id: string,
    filterData: {
      id?: string;
      rate_type_category?: string;
      name?: string;
      abbreviation?: string;
      is_enabled?: boolean | string;
      is_base_rate?: boolean | string;
      updated_on?: any;
      page?: string;
      limit?: string;
    },
    user?: UserInfo,
    requestMethod?: string,
    requestUrl?: string
  ): Promise<ServiceResponse> {
    const trace_id = generateCustomUUID();

    // Log the request
    if (user) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: { program_id, filterData },
          eventname: "Filtering rate types",
          status: "info",
          description: `Filtering rate types for program ${program_id}`,
          level: "info",
          action: requestMethod || "POST",
          url: requestUrl || "",
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );
    }

    try {
      const { id, rate_type_category, name, abbreviation, is_enabled, is_base_rate, updated_on, page, limit } = filterData;

      // Convert boolean filters to numeric values (exact same logic as original)
      const isEnabledFilter =
        typeof is_enabled === 'string'
          ? is_enabled === 'true' ? 1 : 0
          : is_enabled === true ? 1 : is_enabled === false ? 0 : undefined;

      const isBaseRateFilter =
        typeof is_base_rate === 'string'
          ? is_base_rate === 'true' ? 1 : 0
          : is_base_rate === true ? 1 : is_base_rate === false ? 0 : undefined;

      // Parse pagination parameters (exact same logic as original)
      const pageNumber = parseInt(page ?? '1', 10);
      const limitNumber = parseInt(limit ?? '10', 10);
      const offset = (pageNumber - 1) * limitNumber;

      // Check for date range filter (exact same logic as original)
      const hasUpdatedOnFilter = Array.isArray(updated_on) && updated_on.length === 2;

      // Build the query using the advance filter function (exact same logic as original)
      const query = rateTypeAdvanceFilter(
        Boolean(id),
        Boolean(rate_type_category),
        Boolean(name),
        Boolean(abbreviation),
        isBaseRateFilter !== undefined,
        isEnabledFilter !== undefined,
        hasUpdatedOnFilter
      );

      // Build replacements object (exact same logic as original)
      const replacements: Record<string, any> = {
        program_id,
        id,
        rate_type_category,
        name: name ? `%${name}%` : undefined,
        abbreviation: abbreviation ? `%${abbreviation}%` : undefined,
        limit: limitNumber,
        offset,
        is_enabled: isEnabledFilter,
        is_base_rate: isBaseRateFilter,
        updated_on_start: hasUpdatedOnFilter ? updated_on[0] : undefined,
        updated_on_end: hasUpdatedOnFilter ? updated_on[1] : undefined,
      };

      // Execute the query (exact same logic as original)
      const data = await sequelize.query<{ total_count: any }>(query, {
        replacements,
        type: QueryTypes.SELECT,
      });

      // Extract total records (exact same logic as original)
      const totalRecords = data.length > 0 ? data[0].total_count : 0;

      // Log successful operation
      if (user) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: {
              program_id,
              filterData,
              resultCount: data.length,
              totalRecords
            },
            eventname: "filtering rate types",
            status: "success",
            description: `Successfully filtered rate types for program ${program_id}`,
            level: "info",
            action: requestMethod || "POST",
            url: requestUrl || "",
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );
      }

      return {
        success: true,
        status_code: 200,
        message: data.length > 0 ? 'Rate Types fetched successfully.' : 'No records found.',
        trace_id,
        total_records: totalRecords,
        page: pageNumber,
        limit: limitNumber,
        data: data,
      };

    } catch (error: any) {
      // Log error
      if (user) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: { program_id, filterData },
            eventname: "filtering rate types",
            status: "error",
            description: `Error filtering rate types for program ${program_id}`,
            level: "error",
            action: requestMethod || "POST",
            url: requestUrl || "",
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );
      }

      return {
        success: false,
        status_code: 500,
        message: "Internal Server Error",
        trace_id,
        error: error.message,
      };
    }
  }
}

const rateTypeService = new RateTypeService();
export default rateTypeService;