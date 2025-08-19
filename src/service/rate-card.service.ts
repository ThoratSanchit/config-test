import { Op } from "sequelize";
import { sequelize } from "../config/instance";
import RateCard from "../models/rate-card.model";
import DecisionTable from "../models/rate-card-decision.model";
import IndustriesModel from "../models/labour-category.model";
import Hierarchies from "../models/hierarchies.model";
import JobTemplateModel from "../models/job-template.model";
import rateTypeModel from "../models/rate-type.model";


export class RateCardService {
    private program_id: string;
    private rateCards: any[];
    private traceId: string;
    private userId?: string;
    private userName?: string;
    private method: string;
    private url: string;

    constructor(
        program_id: string,
        rateCards: any[],
        traceId: string,
        userId?: string,
        userName?: string,
        method?: string,
        url?: string
    ) {
        this.program_id = program_id;
        this.rateCards = rateCards;
        this.traceId = traceId;
        this.userId = userId;
        this.userName = userName;
        this.method = method || "";
        this.url = url || "";
    }



    async bulkCreate() {
        const transaction = await sequelize.transaction();
        const results = { successful: [] as any[], failed: [] as any[] };

        try {
            const laborCategoryNames = [
                ...new Set(this.rateCards.map(rc => rc.labor_category_id).filter(Boolean)),
            ];

            const hierarchyNames = new Set<string>();
            const hierarchyCodes = new Set<string>();
            const jobTemplateNames = new Set<string>();
            const rateTypeNames = new Set<string>();

            this.rateCards.forEach(rc => {
                if (Array.isArray(rc.decision_table)) {
                    rc.decision_table.forEach((entry: any) => {
                        if (entry.hierarchy_id) hierarchyNames.add(entry.hierarchy_id);
                        if (entry.hierarchy_code) hierarchyCodes.add(entry.hierarchy_code);
                        if (entry.job_template_id) jobTemplateNames.add(entry.job_template_id);
                        if (entry.rate_type_id) rateTypeNames.add(entry.rate_type_id);
                    });
                }
            });

            const laborCategories = await IndustriesModel.findAll({
                where: { name: { [Op.in]: [...laborCategoryNames] }, program_id: this.program_id },
                attributes: ["id", "name"],
                transaction,
            });
            const laborCategoryMap = new Map(laborCategories.map(lc => [lc.name, lc.id]));

            const hierarchies = await Hierarchies.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.in]: [...hierarchyNames] } },
                        { code: { [Op.in]: [...hierarchyCodes] } },
                    ],
                    program_id: this.program_id,
                },
                attributes: ["id", "name", "code"],
                transaction,
            });
            const hierarchyNameMap = new Map(hierarchies.map(h => [h.name, h.id]));
            const hierarchyCodeMap = new Map(hierarchies.map(h => [h.code, h.id]));

            const jobTemplates = await JobTemplateModel.findAll({
                where: { template_name: { [Op.in]: [...jobTemplateNames] }, program_id: this.program_id },
                attributes: ["id", "template_name"],
                transaction,
            });
            const jobTemplateMap = new Map(jobTemplates.map(jt => [jt.template_name, jt.id]));

            const rateTypes = await rateTypeModel.findAll({
                where: { name: { [Op.in]: [...rateTypeNames] }, program_id: this.program_id },
                attributes: ["id", "name"],
                transaction,
            });
            const rateTypeMap = new Map(rateTypes.map(rt => [rt.name, rt.id]));

            for (let i = 0; i < this.rateCards.length; i++) {
                const { decision_table, labor_category_id, ...rateCardData } = this.rateCards[i];

                try {
                    let laborCategoryDbId = null;
                    if (labor_category_id) {
                        laborCategoryDbId = laborCategoryMap.get(labor_category_id);
                        if (!laborCategoryDbId) {
                            results.failed.push({
                                index: i,
                                message: `Labor category not found: ${labor_category_id}`,
                            });
                            continue;
                        }
                    }

                    const newRateCard = await RateCard.create(
                        {
                            ...rateCardData,
                            labor_category_id: laborCategoryDbId,
                            program_id: this.program_id,
                            created_by: this.userId,
                            updated_by: this.userId,
                        },
                        { transaction }
                    );

                    if (decision_table && Array.isArray(decision_table)) {
                        const decisionTableData = decision_table.map((entry: any) => {
                            let resolvedHierarchyId =
                                hierarchyNameMap.get(entry.hierarchy_id) ||
                                hierarchyCodeMap.get(entry.hierarchy_code);
                            if (!resolvedHierarchyId) {
                                throw new Error(
                                    `Hierarchy not found (name: ${entry.hierarchy_id}, code: ${entry.hierarchy_code})`
                                );
                            }

                            let resolvedJobTemplateId = null;
                            if (entry.job_template_id) {
                                resolvedJobTemplateId = jobTemplateMap.get(entry.job_template_id);
                                if (!resolvedJobTemplateId) {
                                    throw new Error(`Job template not found: ${entry.job_template_id}`);
                                }
                            }

                            let resolvedRateTypeId = null;
                            if (entry.rate_type_id) {
                                resolvedRateTypeId = rateTypeMap.get(entry.rate_type_id);
                                if (!resolvedRateTypeId) {
                                    throw new Error(`Rate type not found: ${entry.rate_type_id}`);
                                }
                            }

                            const transformRate = (value: string, rule: string) => {
                                const amount = parseFloat(value.replace(/[^0-9.]/g, ""));
                                const isChangeable = rule?.toLowerCase().includes("can change");
                                return { amount, is_changeable: isChangeable };
                            };

                            return {
                                hierarchy_id: resolvedHierarchyId,
                                job_template_id: resolvedJobTemplateId,
                                rate_type_id: resolvedRateTypeId,
                                unit_of_measure: entry.unit_of_measure,
                                currency: entry.currency,
                                min_rate: transformRate(entry.min_rate, entry.min_rate_rule),
                                max_rate: transformRate(entry.max_rate, entry.max_rate_rule),
                                rate_card_id: newRateCard.id,
                            };
                        });

                        await DecisionTable.bulkCreate(decisionTableData, { transaction });
                    }

                    results.successful.push({
                        index: i,
                        id: newRateCard.id,
                        message: "Rate card created successfully",
                    });
                } catch (err: any) {
                    results.failed.push({
                        index: i,
                        message: err?.message,
                        error: err,
                    });
                }
            }

            await transaction.commit();

            const statusCode = results.failed.length > 0 ? 209 : 201;
            return {
                statusCode,
                response: {
                    status_code: statusCode,
                    message: `Bulk operation completed. ${results.successful.length} created,
                ${results.failed.length} failed`,
                    trace_id: this.traceId,
                    summary: {
                        total: this.rateCards.length,
                        successful: results.successful.length,
                        failed: results.failed.length,
                    },
                    results,
                },
            };
        } catch (error: any) {
            await transaction.rollback();
            return {
                statusCode: 500,
                response: {
                    status_code: 500,
                    message: "Failed to bulk create rate cards",
                    trace_id: this.traceId,
                    error: error?.message,
                },
            };
        }
    }

}
