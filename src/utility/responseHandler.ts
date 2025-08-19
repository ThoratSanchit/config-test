export type ApiResponse<T = unknown> = {
    status_code: number;
    message?: string;
    error?: string;
    data?: T;
    result?: T;
    results?: T;
    // workflow_step?: T;
    trace_id: string;
    meta_data?: unknown;
    meta?: unknown;
    total?: number;
    total_count?: number;
    total_pages?: number;
    limit?: number;
    current_page?: number;
};

export function generateResponse<T>({
    status_code,
    message,
    error,
    data,
    result,
    results,
    // workflow_step,
    trace_id,
    meta_data,
    meta,
    total,
    total_count,
    total_pages,
    limit,
    current_page,
}: ApiResponse<T>): ApiResponse<T> {
    const response: ApiResponse<T> = {
        status_code,
        trace_id,
    };

    if (message) response.message = message;
    if (error) response.error = error;
    if (data !== undefined) response.data = data;
    if (result !== undefined) response.result = result;
    if (results !== undefined) response.results = results;
    // if (workflow_step !== undefined) response.workflow_step = workflow_step;
    if (meta_data !== undefined) response.meta_data = meta_data;
    if (meta !== undefined) response.meta = meta;
    if (total !== undefined) response.total = total;
    if (total_count !== undefined) response.total_count = total_count;
    if (total_pages !== undefined) response.total_pages = total_pages;
    if (limit !== undefined) response.limit = limit;
    if (current_page !== undefined) response.current_page = current_page;

    return response;
}
