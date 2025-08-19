import { FastifyReply, FastifyRequest } from "fastify";
import { WorkLocationInterface } from "../interfaces/work-location.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { WorkLocationService } from "../service/work-location-create.service";
import { RateCardService } from "../service/rate-card.service";



export async function bulkCreateWorkLocations(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const workLocations = request.body as WorkLocationInterface[];
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;

    if (!Array.isArray(workLocations) || workLocations.length === 0) {
        return reply.status(400).send({
            message: "Bad Request - Expected an array of work location objects",
        });
    }

    const service = new WorkLocationService(
        program_id,
        workLocations,
        traceId,
        userId,
        user?.preferred_username,
        request.method,
        request.url
    );

    const { statusCode, response } = await service.bulkCreate();

    return reply.status(statusCode).send(response);
}


export async function bulkCreateRateCards(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const rateCards = request.body as any[];
    const traceId = generateCustomUUID();
    const user = request?.user;

    if (!Array.isArray(rateCards) || rateCards.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Bad Request - Expected an array of rate card objects",
            trace_id: traceId,
        });
    }

    const service = new RateCardService(
        program_id,
        rateCards,
        traceId,
        user?.sub,
        user?.preferred_username,
        request.method,
        request.url
    );

    const { statusCode, response } = await service.bulkCreate();

    return reply.status(statusCode).send(response);
}

