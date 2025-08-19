// src/controllers/rate-configuration.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { RateConfigurationsInterface } from '../interfaces/rate-configurations.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import RateConfigurationService from '../service/rate-configuration.service';

export const createRateConfigurations = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id } = request.params as { program_id: string };
    const rateConfigurationsPayload = request.body as Partial<RateConfigurationsInterface>;
    const user = request?.user;
    const userId = user?.sub;

    try {
        const result = await RateConfigurationService.createRateConfigurations(
            program_id,
            rateConfigurationsPayload,
            userId
        );
        
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
};

export const updateRateConfigurations = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id, id } = request.params as { program_id: string; id: string };
    const rateConfigurationsPayload = request.body as Partial<RateConfigurationsInterface>;
    const user = request?.user;
    const userId = user?.sub;

    try {
        const result = await RateConfigurationService.updateRateConfigurations(
            program_id,
            id,
            rateConfigurationsPayload,
            userId
        );
        
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
};

export const deleteRateConfigurations = async (request: FastifyRequest, reply: FastifyReply) => {
    const { program_id, id } = request.params as { program_id: string; id: string };

    try {
        const result = await RateConfigurationService.deleteRateConfigurations(program_id, id);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
}

export async function getAllRateConfigurations(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const query = request.query as { 
        page?: string; 
        limit?: string; 
        name?: string; 
        job_template_id?: string; 
        hierarchy_id?: string; 
        rate_type?: string; 
        is_enabled?: string; 
        is_shift_rate?: string; 
        updated_on?: string 
    };

    try {
        const result = await RateConfigurationService.getAllRateConfigurations(program_id, query);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
}

export async function getRateConfigurationById(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id, id } = request.params as { program_id: string; id: string };

    try {
        const result = await RateConfigurationService.getRateConfigurationById(program_id, id);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
}

export async function getAllRateConfigurationRates(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string };
    const query = request.query as {
        hierarchie_id: string;
        job_templates: string;
        is_shift_rate: string;
        currency_id: string;
        unit_of_measure: string;
        labor_category_id: string;
        ot_exempt: string;
        job_type: string;
    };

    try {
        const result = await RateConfigurationService.getAllRateConfigurationRates(program_id, query);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
}

export async function getAllHierarchiesAndJobTemplates(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string };

    try {
        const result = await RateConfigurationService.getAllHierarchiesAndJobTemplates(program_id);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
}

export async function getAllRateConfigurationBudget(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string };
    const configs = request.body as any[];

    try {
        const result = await RateConfigurationService.getAllRateConfigurationBudget(program_id, configs);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
}

export async function rateConfigurationsFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const filters = request.body as { 
        id: string; 
        name: string; 
        is_shift_rate: string; 
        job_type: string; 
        is_enabled: string; 
        updated_on: string[]; 
        page: string; 
        limit: string 
    };

    try {
        const result = await RateConfigurationService.rateConfigurationsFilter(program_id, filters);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status || 500).send(error);
    }
}