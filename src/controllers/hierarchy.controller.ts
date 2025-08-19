import { FastifyRequest, FastifyReply } from 'fastify';
import { hierarchiesData } from '../interfaces/hierarchies.interface';
import { baseSearch, advanceSearch } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';
import HierarchiesModel from '../models/hierarchies.model';
import { logger } from '../utility/loggerService';
import Messages from '../language/en/message.language';
import HierarchyService  from '../service/hierarchy.service';
import { AppError } from '../utility/errorHandler';

const hierarchyService = new HierarchyService ();



export const getHierarchiesByProgram = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id, id } = request.params as { program_id: string; id: string };
  const { is_enabled, msp_id } = request.query as { is_enabled: string; msp_id?: string };
  const traceId = generateCustomUUID();

  try {
    const hierarchies = await hierarchyService.getHierarchiesByProgram(
      program_id,
      id,
      is_enabled,
      msp_id
    );

    if (hierarchies.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: Messages.NO_HIERARCHIES_FOUND_FOR_PROGRAM,
        trace_id: traceId,
        hierarchies: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: Messages.HIERARCHIES_FETCHED_SUCCESSFULLY,
      trace_id: traceId,
      hierarchies: hierarchies,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        error: error.message,
        trace_id: traceId,
      });
    }

    return reply.status(500).send({
      status_code: 500,
      message: Messages.ERROR_FETCHING_HIERARCHIES_BY_PROGRAM,
      trace_id: traceId,
      error: error.message
    });
  }
};


export const getHierarchies = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();

  try {
    const result = await hierarchyService.getHierarchies(request);

    if (result.totalRecords === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: Messages.NO_HIERARCHIES_FOUND_FOR_PROGRAM,
        total_records: 0,
        page: result.page,
        limit: result.limit,
        hierarchies: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: Messages.HIERARCHIES_FETCHED_SUCCESSFULLY,
      total_records: result.totalRecords,
      page: result.page,
      limit: result.limit,
      hierarchies: result.hierarchies,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        error: error.message,
        trace_id: traceId,
      });
    }

    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: Messages.ERROR_FETCHING_HIERARCHIES,
      error: error.message,
    });
  }
};




export async function getHierarchiesById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const hierarchy = await hierarchyService.getHierarchyById(id);

    return reply.status(200).send({
      status_code: 200,
      message: Messages.HIERARCHIES_DATA_GET_SUCCESSFULLY,
      trace_id: traceId,
      hierarchies: hierarchy
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        error: error.message,
        trace_id: traceId,
      });
    }

    return reply.status(500).send({
      status_code: 500,
      error: error.message,
      trace_id: traceId,
    });
  }
}


export async function createHierarchies(
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  
  try {
    const result = await hierarchyService.createHierarchies({
      programId: request.params.program_id,
      data: request.body,
      user: request.user,
      traceId
    });

    return reply.status(201).send({
      status_code: 201,
      message: Messages.HIERARCHIES_CREATED_SUCCESSFULLY,
      trace_id: traceId,
      id: result.id
    });
  } catch (error) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        message: error.message,
      });
    }
    return reply.status(500).send({
      message: Messages.FAILED_TO_CREATE_HIERARCHIES,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function updateHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();

  try {
    await hierarchyService.updateHierarchies(request);

    return reply.status(200).send({
      status_code: 200,
      message: Messages.HIERARCHY_UPDATED_SUCCESSFULLY,
      trace_id: traceId,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        message: error.message,
        trace_id: traceId,
      });
    }

    console.error('Internal error:', error);
    return reply.status(500).send({
      status_code: 500,
      message: Messages.INTERNAL_SERVER_ERROR,
      trace_id: traceId,
    });
  }
}

export async function searchHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['is_enabled', 'name', 'code', 'program_id'];
  const responseFields = ['id', 'name', 'updated_on', 'is_enabled', 'program_id'];
  return baseSearch(request, reply, HierarchiesModel, searchFields, responseFields);
}

export async function advancedSearchHierarchies(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const searchFields = ['name', 'updated_on', 'is_enabled', 'name', 'code', 'program_id'];
  const responseFields = ['id', 'name', 'updated_on', 'is_enabled', 'code', 'program_id'];
  return advanceSearch(
    request,
    reply,
    HierarchiesModel,
    searchFields,
    responseFields
  );
}


export const getRateModel = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();

  try {
    const result = await hierarchyService.getRateModel(request);

    if (result.hierarchies.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: Messages.RATE_MODEL_FOUND_BUT_NO_HIERARCHIES,
        trace_id: traceId,
        rate_model: result.rate_model,
        hierarchies: result.hierarchies,
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: Messages.RATE_MODEL_FOUND_SUCCESSFULLY,
      trace_id: traceId,
      rate_model: result.rate_model,
      hierarchies: result.hierarchies,
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        error: error.message,
        trace_id: traceId,
      });
    }

    return reply.status(500).send({
      status_code: 500,
      message: Messages.INTERNAL_SERVER_ERROR_LOWERCASE,
      trace_id: traceId,
      error: error.message
    });
  }
};



export async function getVendorMarkup(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();

  try {
    const result = await hierarchyService.getVendorMarkup(request);

    if (!result.markup) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: result.message,
        rate_model: result.rate_model,
        markups: result.markups,
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: Messages.VENDOR_BILL_RATE_MARKUP_RETRIEVED,
      trace_id: traceId,
      rate_model: result.rate_model,
      markup: result.markup,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        message: error.message,
        trace_id: traceId,
        error: error.message,
      });
    }

    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      message: Messages.FAILED_TO_RETRIEVE_VENDOR_MARKUP,
      trace_id: traceId,
      error: error.message,
    });
  }
}

export const updateIsNotEditableFlag = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();

  try {
    const result = await hierarchyService.updateIsNotEditableFlag(request);

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: Messages.HIERARCHIES_UPDATED_SUCCESSFULLY,
      updated_hierarchy_ids: result.updated_hierarchy_ids
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      if (error.statusCode === 200) {
        return reply.status(200).send({
          status_code: 200,
          trace_id: traceId,
          message: error.message,
          data: []
        });
      }
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        message: error.message
      });
    }

    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: Messages.INTERNAL_SERVER_ERROR,
      error: error.message
    });
  }
};

export async function getUserHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();

  try {
    const hierarchies = await hierarchyService.getUserHierarchies(request);

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: Messages.HIERARCHIES_FETCHED_SUCCESSFULLY,
      hierarchies: hierarchies,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        message: error.message,
        trace_id: traceId,
        error: error.message,
      });
    }

    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: Messages.INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
}


export const getHierarchiesAdvancedFilter = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();

  try {
    const result = await hierarchyService.getHierarchiesAdvancedFilter(request);

    const message =
      result.total_records === 0
        ? Messages.NO_HIERARCHIES_FOUND_FOR_PROGRAM
        : Messages.HIERARCHIES_FETCHED_SUCCESSFULLY;

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message,
      total_records: result.total_records,
      page: result.page,
      limit: result.limit,
      hierarchies: result.hierarchies,
    });
  } catch (error: any) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: Messages.ERROR_FETCHING_HIERARCHIES,
      error: error.message,
    });
  }
};

export async function getParentHierarchies(
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply
) {
  const { program_id } = request.params;
  const traceId = generateCustomUUID();

  try {
    const parentHierarchies = await hierarchyService.getParentHierarchies(program_id);

    if (!parentHierarchies || parentHierarchies.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: Messages.NO_PARENT_HIERARCHIES_FOUND,
        data: [],
        trace_id: traceId,
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: Messages.PARENT_HIERARCHIES_RETRIEVED_SUCCESSFULLY,
      data: parentHierarchies,
      trace_id: traceId,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        error: error.message,
        trace_id: traceId,
      });
    }
    return reply.status(500).send({
      status_code: 500,
      error: error.message,
      trace_id: traceId,
    });
  }
}

export const getMspByClient = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const { client_id, hierarchy_id } = request.query as { client_id?: string; hierarchy_id?: string };
  const traceId = generateCustomUUID();

  try {
    const tenants = await hierarchyService.getMspByClient(program_id, client_id, hierarchy_id);

    if (!tenants.length) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: Messages.NO_MSP_FOUND,
        data: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: Messages.MSP_FETCHED_SUCCESSFULLY,
      data: tenants,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status_code: error.statusCode,
        trace_id: traceId,
        message: error.message,
      });
    }
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: Messages.ERROR_FETCHING_MSP,
      error: error.message,
    });
  }
};


export async function bulkCreateHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const hierarchiesData = request.body as hierarchiesData[];
  const traceId = generateCustomUUID();
  const user = request?.user;

  try {
    const result = await hierarchyService.bulkCreateHierarchies(program_id, hierarchiesData, user, request);

    const statusCode = result.summary.failed > 0 ? 207 : 201;

    logger({
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: user?.sub },
      data: result.summary,
      eventname: "bulk created hierarchies",
      status: result.summary.failed > 0 ? "partial_success" : "success",
      description: `Bulk created hierarchies for ${program_id}: ${result.summary.successful}/${result.summary.total} successful`,
      level: result.summary.failed > 0 ? "warning" : "success",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    }, HierarchiesModel);

    return reply.status(statusCode).send({
      status_code: statusCode,
   message: `Bulk operation completed. ${result.summary.successful} created, ${result.summary.failed} failed, ${result.summary.duplicates} duplicates`, 
      summary: result.summary,
      results: result.results,
       trace_id: traceId,
    });

  } catch (error: any) {
    logger({
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: user?.sub },
      data: { count: hierarchiesData.length, program_id },
      eventname: "bulk creating hierarchies",
      status: "error",
      description: `Error bulk creating hierarchies for ${program_id}`,
      level: "error",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    }, HierarchiesModel);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        message: error.message,
        error: error.message,
        trace_id: traceId
      });
    }

    return reply.status(500).send({
      message: Messages.FAILED_TO_BULK_CREATE_HIERARCHIES,
      error: error.message,
      trace_id: traceId
    });
  }
}