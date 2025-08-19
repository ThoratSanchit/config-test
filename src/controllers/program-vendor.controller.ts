// src/controllers/program-vendor.controller.ts
import { FastifyRequest, FastifyReply } from "fastify";
import programVendorService from "../service/program-vendor.service";
import { programVendorQueryInterface, programVendorInterface } from "../interfaces/program-vendor.interface";
import { VendorComplianceDocumentInterface } from "../interfaces/vendor-compliance-document.interface";

export async function getProgramVendors(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id } = request.params as { program_id: string };
        const query = request.query as programVendorQueryInterface & { page?: string; limit?: string; hierarchy_ids?: any };
        
        const result = await programVendorService.getProgramVendors({ program_id }, query);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}

export async function saveProgramVendor(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id } = request.params as { program_id: string };
        const body = request.body as any;
        const headers = request.headers as { authorization?: string };
        
        const result = await programVendorService.saveProgramVendor({ program_id }, body, headers);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}

export const updateProgramVendor = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id, tenant_id } = request.params as { program_id: string; tenant_id: string };
        const body = request.body as Partial<programVendorInterface>;
        const headers = request.headers as { authorization?: string };
        
        const result = await programVendorService.updateProgramVendor({ program_id, tenant_id }, body, headers);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
};

export async function deleteProgramVendor(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const headers = request.headers as { authorization?: string };
        
        const result = await programVendorService.deleteProgramVendor({ program_id, id }, headers);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}

export const getProgramVendorById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        
        const result = await programVendorService.getProgramVendorById({ program_id, id });
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
};

export async function getVendorAndVendorGroup(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { program_id } = request.params as { program_id: string };
        const query = request.query as {
            hierarchy_ids?: string;
            labor_category_id?: string;
            work_location_id?: string;
            search?: string;
        };
        
        const result = await programVendorService.getVendorAndVendorGroup({ program_id }, query);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}

export async function updateProgramVendorByUserId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id, user_id } = request.params as { program_id: string; user_id: string };
        const body = request.body as Partial<programVendorInterface>;
        const headers = request.headers as { authorization?: string };
        
        const result = await programVendorService.updateProgramVendorByUserId({ program_id, user_id }, body, headers);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
};

export const getVendorDocuments = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { program_id } = request.params as { program_id: string };
        const query = request.query as {
            vendor_id?: string;
            document_id?: string;
            page?: string;
            limit?: string;
            name?: string;
            is_enabled?: string;
            status?: string;
            updated_on?: any;
            next_expiry_on?: any;
            compliance_verified?: string;
            expiry_on?: any;
        };
        const headers = request.headers as { authorization?: string };
        
        const result = await programVendorService.getVendorDocuments({ program_id }, query, headers);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
};

export const getProgramVendorByUserId = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { program_id } = request.params as { program_id: string };
        const query = request.query as { user_id?: string; vendor_id?: string };
        
        const result = await programVendorService.getProgramVendorByUserId({ program_id }, query);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
};

export async function updateComplianceDocument(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id } = request.params as { program_id: string };
        const query = request.query as { document_id: string; vendor_id?: string };
        const body = request.body as Partial<VendorComplianceDocumentInterface>;
        const headers = request.headers as { authorization?: string };
        
        const result = await programVendorService.updateComplianceDocument({ program_id }, query, body, headers);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}

export async function getComplianceDocument(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id, user_id } = request.params as { program_id: string; user_id: string };
        const query = request.query as { document_id?: string };
        
        const result = await programVendorService.getComplianceDocument({ program_id, user_id }, query);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}

export async function advanceFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id } = request.params as { program_id: string };
        const body = request.body as {
            display_name: string;
            country_id: string;
            hierarchy_ids: string[];
            labor_category_id: string[];
            work_location_id: string[];
            job_type: string[];
            status: string;
            contact_email: string;
            full_name: string;
            compliance_status: string;
            is_audited: boolean;
            page: string;
            limit: string;
        };
        
        const result = await programVendorService.advanceFilter({ program_id }, body);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}

export async function getVendorMarkup(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const body = request.body as {
            rate_model?: string;
            hierarchy?: string[];
            labor_category?: string[];
            job_template?: string[];
            worker_type?: string[];
            worker_classification?: string[];
            rate_type?: string[];
        };
        
        const result = await programVendorService.getVendorMarkup({ program_id, id }, body);
        return reply.status(result.status_code).send(result);
    } catch (error: any) {
        return reply.status(error.status_code || 500).send(error);
    }
}