import ProgramsConfig from "../models/programs-config.model";
import { ProgramConfigAttributes } from "../interfaces/program-config.interface";
import { Op } from "sequelize";

export class ProgramConfigService {
    
    async getAllConfigurations() {
        const configurations = await ProgramsConfig.findAll({ 
            order: [["sr_Number", "ASC"]] 
        });
        return configurations;
    }

    async getConfigurationById(id: string) {
        const configuration = await ProgramsConfig.findByPk(id);
        return configuration;
    }

    async createConfiguration(configData: Partial<ProgramConfigAttributes>, userId: string) {
        // Set user information
        configData.created_by = userId;
        configData.updated_by = userId;
        
        const newConfiguration = await ProgramsConfig.create(configData);
        return newConfiguration;
    }

    async updateConfigurations(
        program_id: string, 
        configs: Array<Partial<ProgramConfigAttributes & { id: string; value: any }>>,
        userId: string
    ) {
        const updatedConfigurations = [];

        for (const configData of configs) {
            const { id, value, child_config } = configData;

            const configuration = await ProgramsConfig.findOne({
                where: {
                    id,
                    program_id,
                },
            });

            if (configuration) {
                await configuration.update({ 
                    value, 
                    child_config, 
                    updated_by: userId 
                });
                updatedConfigurations.push(configuration);
            } else {
                throw new Error(`Configuration With ID ${id} Not Found`);
            }
        }

        return updatedConfigurations;
    }

    async deleteConfiguration(id: string) {
        const configuration = await ProgramsConfig.findByPk(id);
        
        if (!configuration) {
            return null;
        }

        await configuration.destroy();
        return configuration;
    }

    async getProgramConfigurations(
        program_id: string, 
        config_model?: string, 
        title?: string
    ) {
        const queryConditions: any = { program_id };
        if (title) queryConditions.title = { [Op.like]: `%${title}%` };
        if (config_model) queryConditions.config_model = config_model;

        const configurations = await ProgramsConfig.findAll({
            where: queryConditions,
        });

        if (configurations.length === 0) {
            return [];
        }

        const configMap = new Map<string, any>();
        configurations.forEach(config => {
            const configData = { ...config.toJSON(), child_config: [] };
            configMap.set(config.configuration_id, configData);
        });

        configMap.forEach(config => {
            if (config.parent_config_id) {
                const parentConfig = configMap.get(config.parent_config_id);
                parentConfig?.child_config.push(config);
            }
        });

        const filteredResult = [...configMap.values()].filter(config => !config.parent_config_id);
        return filteredResult;
    }

    async getConfigByProgramIdAndTitles(
        program_id: string, 
        title?: string, 
        key?: string
    ) {
        const responseFields = ['id', 'title', 'value', 'key'];
        const whereClause: any = { program_id };

        if (title) {
            const titlesArray = title.split(',').map((t) => t.trim());
            whereClause.title = titlesArray.length > 1 ? { [Op.in]: titlesArray } : titlesArray[0];
        }

        if (key) {
            whereClause.key = key;
        }

        const results = await ProgramsConfig.findAll({
            where: whereClause,
            attributes: responseFields,
        });

        return results;
    }

    async getTransformedConfig(
        program_id: string, 
        config_model?: string, 
        key?: string
    ) {
        const whereClause: Record<string, any> = { program_id };
        if (config_model) whereClause.config_model = config_model;
        if (key) whereClause.key = key;

        const configuration = await ProgramsConfig.findOne({
            where: whereClause,
        });

        if (!configuration) {
            return null;
        }

        const transformedConfig = this.transformConfiguration(configuration.toJSON());
        return transformedConfig;
    }

    private transformConfiguration(config: any) {
        const transformed: any = {
            id: config.id,
        };

        if (Array.isArray(config.value)) {
            config.value.forEach((entry: any) => {
                const scope = entry.title.toLowerCase().replace(" ", "_");
                if (Array.isArray(entry.fields)) {
                    entry.fields.forEach((field: any) => {
                        if (field.type === "group") {
                            const key = field.label
                                .toLowerCase()
                                .replace(/[^a-zA-Z0-9]+/g, "_")
                                .replace(/(^_|_$)/g, "");
                            transformed[`${key}`] = {
                                name: field.label,
                                scale: this.getScaleValue(field.fields, "Scaling Limit"),
                                threshold: this.getScaleValue(field.fields, "Scaling Threshold"),
                                precision_type: this.getFieldValue(field.fields, "Scaling Type"),
                                scope: scope,
                            };
                        }
                    });
                }
            });
        }

        return transformed;
    }

    private getScaleValue(fields: any[], label: string) {
        return fields.find((field: any) => field.label === label)?.value || 1;
    }

    private getFieldValue(fields: any[], label: string) {
        return fields.find((field: any) => field.label === label)?.value || "Round Up";
    }
}
