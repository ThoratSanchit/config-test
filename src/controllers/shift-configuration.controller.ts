import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from '../utility/genrateTraceId';
import { ShiftConfigurationAttributes } from "../interfaces/shift-configuration.interface";
import { sequelize } from '../config/instance';
import { QueryTypes } from 'sequelize';
import { sameShiftConfiguration } from "../utility/queries";
import ShiftConfigurationService from '../service/shift-configuration.service';

export const getAllshiftConfiguration = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, start_date, end_date, hierarchy_names, hierarchy_ids, shift_type_name, page = '1', limit = '10' } = request.query as { name?: string; is_enabled?: boolean | string; start_date?: string; end_date?: string; hierarchy_names?: string; hierarchy_ids?: string; shift_type_name?: string; page?: string; limit?: string };

  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: traceId,
    });
    return;
  }

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid page number',
      trace_id: traceId,
    });
    return;
  }

  if (isNaN(pageSize) || pageSize < 1) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid limit',
      trace_id: traceId,
    });
    return;
  }

  try {
    const shiftConfigService = new ShiftConfigurationService();
    const result = await shiftConfigService.getAllShiftConfigurations({
      program_id,
      name,
      is_enabled,
      start_date,
      end_date,
      hierarchy_names,
      hierarchy_ids,
      shift_type_name,
      page,
      limit
    });

    if (result.shiftConfigurations.length > 0) {
      reply.status(200).send({
        status_code: 200,
        page: result.page,
        limit: result.limit,
        total_records: result.total_records,
        shiftConfigurations: result.shiftConfigurations,
        message: 'Shift configurations retrieved successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        shiftConfigurations: [],
        message: 'Shift configurations not found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
    });
  }
};




export async function getShiftConfigurationById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params as { id: string; program_id: string };

    const shiftConfigService = new ShiftConfigurationService();
    const shiftConfiguration = await shiftConfigService.getShiftConfigurationById(id, program_id);

    if (!shiftConfiguration) {
      return reply.status(200).send({
        status_code: 200,
        shiftConfiguration: {},
        message: 'Shift Configuration not found.',
        trace_id: traceId,
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: " Shift Configuration found.",
      trace_id: traceId,
      shiftConfiguration,
    });
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Internal server error',
    });
  }
}

export async function createShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;

  try {
    const shiftTypeData = request.body as ShiftConfigurationAttributes;

    const shiftConfigService = new ShiftConfigurationService();
    const result = await shiftConfigService.createShiftConfiguration(shiftTypeData, userId);

    reply.status(201).send({
      status_code: 201,
      id: result.id,
      message: 'Shift configuration created successfully',
      trace_id: traceId,
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        reply.status(400).send({
          status_code: 400,
          trace_id: traceId,
          message: error.message,
        });
      } else if (error.message.includes('same hierarchy')) {
        reply.status(409).send({
          status_code: 409,
          message: error.message,
          trace_id: traceId,
        });
      } else {
        reply.status(500).send({
          status_code: 500,
          trace_id: traceId,
          message: error.message
        });
      }
    } else {
      reply.status(500).send({
        status_code: 500,
        trace_id: traceId,
        message: 'An unknown error occurred'
      });
    }
  }
}

export async function updateShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const shiftTypeData = request.body as ShiftConfigurationAttributes;
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;

  try {
    const shiftConfigService = new ShiftConfigurationService();
    await shiftConfigService.updateShiftConfiguration(id, program_id, shiftTypeData, userId);

    reply.status(200).send({
      status_code: 200,
      message: 'Shift configuration updated successfully.',
      trace_id: traceId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        reply.status(404).send({
          status_code: 404,
          message: error.message,
          trace_id: traceId,
        });
      } else if (error.message.includes('already exists')) {
        reply.status(400).send({
          status_code: 400,
          message: error.message,
          trace_id: traceId,
        });
      } else {
        reply.status(500).send({
          status_code: 500,
          message: error.message,
          trace_id: traceId,
        });
      }
    } else {
      reply.status(500).send({
        status_code: 500,
        message: 'Internal server error',
        trace_id: traceId,
      });
    }
  }
}



export async function deleteShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;

  try {
    const shiftConfigService = new ShiftConfigurationService();
    const result = await shiftConfigService.deleteShiftConfiguration(id, program_id, userId);

    if (result.found) {
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'Shift configuration deleted successfully.',
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Shift configuration not found.',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal server error"
    });
  }
}

export const getFilteredShiftConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, updated_on, hierarchy_names, shift_type_name, page = 1, limit = 10 } = request.body as { name?: string; is_enabled?: boolean | string; updated_on?: string[]; hierarchy_names?: string; shift_type_name?: string; page?: number; limit?: number };

  if (!program_id) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: traceId,
    });
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Invalid page number',
      trace_id: traceId,
    });
  }

  if (isNaN(pageSize) || pageSize < 1) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Invalid limit',
      trace_id: traceId,
    });
  }

  try {
    const shiftConfigService = new ShiftConfigurationService();
    const result = await shiftConfigService.getFilteredShiftConfiguration({
      program_id,
      name,
      is_enabled,
      updated_on,
      hierarchy_names,
      shift_type_name,
      page,
      limit
    });

    if (result.shiftConfigurations.length > 0) {
      return reply.status(200).send({
        status_code: 200,
        page: result.page,
        limit: result.limit,
        total_records: result.total_records,
        shiftConfigurations: result.shiftConfigurations,
        message: 'Shift configurations retrieved successfully',
        trace_id: traceId,
      });
    } else {
      return reply.status(200).send({
        status_code: 200,
        shiftConfigurations: [],
        message: 'Shift configurations not found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
    });
  }
};
