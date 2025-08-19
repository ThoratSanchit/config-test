import rateType from "../models/rate-type.model";
import { FastifyRequest, FastifyReply } from "fastify";
import { CreateRateTypeData, RateTypeInterface } from "../interfaces/rate-type-interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { QueryTypes, Sequelize } from "sequelize";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import rateTypeService from "../service/rate-type.service";

export const saveRateType = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = request.body as CreateRateTypeData;
  const { program_id } = request.params as { program_id: string };
  const user = request?.user;

  const result = await rateTypeService.createRateType(
    data,
    program_id,
    user,
    request.method,
    request.url
  );

  if (result.success) {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      id: result.data?.id,
      message: result.message,
      trace_id: result.trace_id,
    });
  } else {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      message: result.message,
      trace_id: result.trace_id,
      ...(result.error && { error: result.error }),
    });
  }
};
export async function getAllRateType(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { program_id } = request.params as { program_id: string };
  const query = request.query as RateTypeInterface;

  try {
    const result = await rateTypeService.getAllRateTypes(query, program_id);

    if (result.success) {
      return reply.status(result.status_code).send({
        status_code: result.status_code,
        trace_id: result.trace_id,
        message: result.message,
        total_records: result.total_records,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
        rate_type: result.data,
      });
    } else {
      return reply.status(result.status_code).send({
        status_code: result.status_code,
        trace_id: result.trace_id,
        message: result.message,
        ...(result.error && { error: result.error }),
      });
    }
  } catch (error: any) {
    const traceId = generateCustomUUID();
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal server error",
      error: error.message,
    });
  }
}
export async function getRateTypeById(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as {
    id: string;
    program_id: string;
  };
  const traceId = generateCustomUUID();
  if (!id || !program_id) {
    return reply.status(400).send({
      status_code: 400,
      trace_id: traceId,
      message: "Invalid parameters"
    });
  }
  try {
    const rateTypeRecord = await rateType.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      }
    });

    if (!rateTypeRecord) {
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message: "Rate type not found"
      });
    }

    const [rateTypeCategory] = await sequelize.query(`SELECT id, label, value FROM picklistitems WHERE id = :rateTypeCategoryId;`, {
      replacements: { rateTypeCategoryId: rateTypeRecord.rate_type_category }
    });

    const [shiftType] = await sequelize.query(`SELECT id, shift_type_name FROM shift_types WHERE id = :shiftTypeId;`, {
      replacements: { shiftTypeId: rateTypeRecord.shift_type }
    });

    rateTypeRecord.rate_type_category = rateTypeCategory.length > 0 ? rateTypeCategory[0] : null;
    rateTypeRecord.shift_type = shiftType.length > 0 ? shiftType[0] : null;

    return reply.status(200).send({
      status_code: 200,
      message: "Get Ratetype succesfully",
      rate_type: rateTypeRecord,
      trace_id: traceId,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to retrieve rate type",
      error: error.message
    });
  }
}

export const updateRateTypeById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id, id } = request.params as { program_id: string; id: string };
  const updates = request.body as CreateRateTypeData;
  const user = request?.user;

  const result = await rateTypeService.updateRateTypeById(
    id,
    program_id,
    updates,
    user,
    request.method,
    request.url
  );

  if (result.success) {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      message: result.message,
      trace_id: result.trace_id,
    });
  } else {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      message: result.message,
      trace_id: result.trace_id,
      ...(result.error && { error: result.error }),
    });
  }
};

export async function getDifferentialOnForRateType(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { is_shift_rate } = request.query as { is_shift_rate?: string };
  const user = request?.user;

  const result = await rateTypeService.getDifferentialOnForRateType(
    program_id,
    is_shift_rate,
    user,
    request.method,
    request.url
  );

  if (result.success) {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      message: result.message,
      trace_id: result.trace_id,
      differential_on: result.data,
    });
  } else {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      trace_id: result.trace_id,
      message: result.message,
      ...(result.error && { error: result.error }),
    });
  }
}

export async function getShiftAndRateType(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const user = request?.user;

  const result = await rateTypeService.getShiftAndRateType(
    program_id,
    user,
    request.method,
    request.url
  );

  if (result.success) {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      trace_id: result.trace_id,
      data: result.data,
    });
  } else {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      trace_id: result.trace_id,
      message: result.message,
      ...(result.error && { error: result.error }),
    });
  }
}

export async function rateTypeFilter(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const filterData = request.body as {
    id?: string;
    rate_type_category?: string;
    name?: string;
    abbreviation?: string;
    is_enabled?: boolean | string;
    is_base_rate?: boolean | string;
    updated_on?: any;
    page?: string;
    limit?: string;
  };
  const user = request?.user;

  const result = await rateTypeService.rateTypeFilter(
    program_id,
    filterData,
    user,
    request.method,
    request.url
  );

  if (result.success) {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      trace_id: result.trace_id,
      message: result.message,
      total_records: result.total_records,
      page: result.page,
      limit: result.limit,
      rate_type: result.data,
    });
  } else {
    return reply.status(result.status_code).send({
      status_code: result.status_code,
      message: result.message,
      trace_id: result.trace_id,
      ...(result.error && { error: result.error }),
    });
  }
}
