import { Op } from "sequelize";
import { sequelize } from "../config/instance";
import { WorkLocationInterface } from "../interfaces/work-location.interface";
import WorkLocationModel from "../models/work-location.model";
import { logger } from "../utility/loggerService";
import CountryModel from "../models/countries.model";

export class WorkLocationService {
  private program_id: string;
  private workLocations: WorkLocationInterface[];
  private traceId: string;
  private userId?: string;
  private userName?: string;
  private method: string;
  private url: string;

  constructor(
    program_id: string,
    workLocations: WorkLocationInterface[],
    traceId: string,
    userId?: string,
    userName?: string,
    method?: any,
    url?: any
  ) {
    this.program_id = program_id;
    this.workLocations = workLocations;
    this.traceId = traceId;
    this.userId = userId;
    this.userName = userName;
    this.method = method;
    this.url = url;
  }

  async bulkCreate() {
    const transaction = await sequelize.transaction();
    const results = {
      successful: [] as any[],
      failed: [] as any[],
      duplicates: [] as any[],
    };

    try {
      const countryIds = [...new Set(this.workLocations.map(wl => wl.country_id).filter(Boolean))];

      const countries = await CountryModel.findAll({
        where: {
          iso_code_3: { [Op.in]: countryIds },
        },
        attributes: ['id', 'iso_code_3'],
        transaction,
      });

      const countryMap = new Map(countries.map(c => [c.iso_code_3, c.id]));

      const locationCodes = this.workLocations.map(wl => wl.code);
      const locationNames = this.workLocations.map(wl => wl.name);

      const existingLocations = await WorkLocationModel.findAll({
        where: {
          program_id: this.program_id,
          is_deleted: false,
          [Op.or]: [
            { code: { [Op.in]: locationCodes } },
            { name: { [Op.in]: locationNames } },
          ],
        },
        attributes: ["code", "name"],
        transaction,
      });

      const existingCodeSet = new Set(existingLocations.map(loc => loc.code));
      const existingNameSet = new Set(existingLocations.map(loc => loc.name));
      const newRecords: any[] = [];
      this.workLocations.forEach((loc, index) => {
        const { code, name, country_id: countryCode } = loc;

        if (existingCodeSet.has(code) || existingNameSet.has(name)) {
          results.duplicates.push({
            index,
            code,
            name,
            message: "Work location with same code or name already exists",
          });
          return;
        }

        const country_id = countryMap.get(countryCode);
        if (!country_id) {
          results.failed.push({
            index,
            code,
            name,
            country_name: countryCode,
            message: `Country not found for ID: ${countryCode}`,
          });
          return;
        }
        newRecords.push({
          ...loc,
          program_id: this.program_id,
          created_by: this.userId,
          updated_by: this.userId,
          country_id,
        });

        existingCodeSet.add(code);
        existingNameSet.add(name);
      });

      if (newRecords.length > 0) {
        const createdLocations = await WorkLocationModel.bulkCreate(newRecords, { transaction });

        createdLocations.forEach((item, idx) => {
          results.successful.push({
            index: idx,
            id: item.id,
            code: item.code,
            name: item.name,
            message: "Work location created successfully",
          });
        });
      }

      await transaction.commit();

      const statusCode = results.duplicates.length > 0 ? 209 : 201;

      logger({
        trace_id: this.traceId,
        actor: { user_name: this.userName, user_id: this.userId },
        data: {
          total: this.workLocations.length,
          successful: results.successful.length,
          failed: results.failed.length,
          duplicates: results.duplicates.length,
        },
        eventname: "bulk created work locations",
        status: results.failed.length > 0 ? "partial_success" : "success",
        description: `Bulk created work locations for ${this.program_id}: ${results.successful.length}/${this.workLocations.length} successful`,
        level: results.failed.length > 0 ? "warning" : "success",
        action: this.method,
        url: this.url,
        entity_id: this.program_id,
        is_deleted: false,
      }, WorkLocationModel);

      return {
        statusCode,
        response: {
          status_code: statusCode,
          message: `Bulk operation completed. ${results.successful.length} created, ${results.failed.length} failed, ${results.duplicates.length} duplicates`,
          trace_id: this.traceId,
          summary: {
            total: this.workLocations.length,
            successful: results.successful.length,
            failed: results.failed.length,
            duplicates: results.duplicates.length,
          },
          results,
        },
      };
    } catch (error) {
      await transaction.rollback();

      logger({
        trace_id: this.traceId,
        actor: { user_name: this.userName, user_id: this.userId },
        data: { count: this.workLocations.length, program_id: this.program_id },
        eventname: "bulk creating work locations",
        status: "error",
        description: `Error bulk creating work locations for ${this.program_id}`,
        level: "error",
        action: this.method,
        url: this.url,
        entity_id: this.program_id,
        is_deleted: false,
      }, WorkLocationModel);

      return {
        statusCode: 500,
        response: {
          status_code: 500,
          message: "Failed to bulk create work locations",
          trace_id: this.traceId,
          error: (error as any)?.message,
        },
      };
    }
  }
}
