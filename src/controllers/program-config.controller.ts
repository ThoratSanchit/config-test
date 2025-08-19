import { FastifyRequest, FastifyReply } from "fastify";
import { ProgramConfigAttributes } from "../interfaces/program-config.interface";
import generateCustomUUID from '../utility/genrateTraceId';
import { ProgramConfigService } from "../service/program-config.service";

export const getConfigurations = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const programConfigService = new ProgramConfigService();

  const configurations = await programConfigService.getAllConfigurations();
  if (configurations.length === 0) {
    return reply.status(200).send({ message: "Configuration Not Found", hierarchies: [] });
  }
  reply.status(200).send({
    status_code: 200,
    message: "Configurations fetched successfully",
    program_configurations: configurations,
    trace_id: traceId,
  });
};

export const getConfigurationById = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const programConfigService = new ProgramConfigService();
  const { id } = request.params as { id: string };

  const configuration = await programConfigService.getConfigurationById(id);
  if (configuration) {
    reply.status(200).send({
      status_code: 200,
      message: "Configuration fetched successfully",
      program_configuration: configuration,
      trace_id: traceId,
    });
  } else {
    reply.status(200).send({ status_code: 200, message: "Configuration Not Found", programsConfig: [] });
  }
};

export const createConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const programConfigService = new ProgramConfigService();
  const configData = request.body as Partial<ProgramConfigAttributes>;

  const user = request?.user;
  const userId = user?.sub;

  const newConfiguration = await programConfigService.createConfiguration(configData, userId);

  reply.status(200).send({
    status_code: 200,
    message: "program configuration created successfully",
    trace_id: traceId,
    programsConfig: newConfiguration.id
  });
};

export const updateConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const programConfigService = new ProgramConfigService();

  const user = request?.user;
  const userId = user?.sub;

  try {
    const { program_id } = request.params as { program_id: string };
    const configs = request.body as Array<Partial<ProgramConfigAttributes & { id: string; value: any }>>;

    const updatedConfigurations = await programConfigService.updateConfigurations(
      program_id,
      configs,
      userId
    );

    reply.status(200).send({
      status_code: 200,
      message: `Configuration has been updated  `,
      updatedConfigurations: updatedConfigurations,
      trace_id: traceId,
    });
  } catch (error: any) {
    if (error.message.includes('Not Found')) {
      return reply.status(200).send({
        status_code: 200,
        message: error.message
      });
    }

    reply.status(500).send({
      stutus_code: 500,
      message: "Failed to update the configurations",
      error,
      trace_id: traceId,
    });
  }
};

export const deleteConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { id } = request.params as { id: string };
  const programConfigService = new ProgramConfigService();

  const user = request?.user;
  const userId = user?.sub;

  const configuration = await programConfigService.deleteConfiguration(id);
  if (configuration) {
    reply.status(204).send({
      status_code: 204,
      message: "Configuration delete successfully",
    });
  } else {
    reply.status(200).send({ status_code: 200, message: "Configuration Not Found" });
  }
};

export const getProgramConfigurations = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };
  const { config_model, title } = request.query as {
    config_model?: string;
    title?: string;
  };

  const traceId = generateCustomUUID();
  const programConfigService = new ProgramConfigService();

  try {
    const filteredResult = await programConfigService.getProgramConfigurations(
      program_id,
      config_model,
      title
    );

    if (filteredResult.length === 0) {
      return reply.status(200).send({ message: "Configuration Not Found", programsConfigs: [] });
    }

    return reply.status(200).send({
      statusCode: 200,
      message: "Program configurations retrieved successfully",
      configuration: filteredResult,
      traceId: traceId
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

export async function getConfigByProgramIdAndTitles(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { title, key } = request.query as { title?: string; key?: string };
  const programConfigService = new ProgramConfigService();

  try {
    const results = await programConfigService.getConfigByProgramIdAndTitles(
      program_id,
      title,
      key
    );

    if (results.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: 'No configurations found for the given program ID and title(s).',
        ProgramsConfig: []
      });
    }

    reply.status(200).send({
      status_code: 200,
      message: 'Configurations fetched successfully.',
      data: results,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: (error as any).message,
    });
  }
}

export const getTransformedConfig = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const { config_model, key } = request.query as { config_model?: string; key?: string };
  const programConfigService = new ProgramConfigService();

  try {
    const transformedConfig = await programConfigService.getTransformedConfig(
      program_id,
      config_model,
      key
    );

    if (!transformedConfig) {
      return reply.status(200).send({
        status_code: 200,
        message: "Configuration Not Found",
        configuration: null,
      });
    }

    reply.status(200).send({
      status_code: 200,
      message: "Configuration transformed successfully",
      configuration: transformedConfig,
    });
  } catch (error) {
    console.error("Error transforming configuration:", error);
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
};