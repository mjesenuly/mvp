import type { Input, Operation, RepairService, Snapshot } from './service';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiSnapshot = Snapshot & { csrfToken: string };

/** Same-origin cookie transport. No session secrets are persisted in client storage. */
export class ApiService implements RepairService {
  private csrfToken = '';
  constructor(private transport: typeof fetch = (...args) => fetch(...args)) {}

  private async send(path: string, method = 'GET', body?: Input): Promise<Snapshot> {
    let response: Response;
    try {
      response = await this.transport(path, {
        method,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...(method !== 'GET' ? {
          'Content-Type': 'application/json', 'X-CSRF-Token': this.csrfToken,
        } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) this.csrfToken = '';
      throw new ApiError(response.status, data?.code ?? 'HTTP_ERROR', data?.message ?? `Server request failed (${response.status}). Try again.`);
    }
    if (!data || !('csrfToken' in data) || !Array.isArray(data.requests) || !Array.isArray(data.offers) || !Array.isArray(data.users)) {
      throw new ApiError(502, 'INVALID_RESPONSE', 'The server returned an invalid workspace. Try refreshing.');
    }
    const { csrfToken, ...snapshot } = data as ApiSnapshot;
    this.csrfToken = csrfToken;
    return snapshot;
  }

  load() { return this.send('/api/session'); }

  async act(operation: Operation, input: Input = {}): Promise<Snapshot> {
    if (['login', 'register'].includes(operation)) return this.send(`/api/auth/${operation}`, 'POST', input);
    if (!this.csrfToken) await this.load();
    if (operation === 'logout') return this.send('/api/auth/logout', 'POST', {});
    const { id, ...body } = input;
    if (operation === 'request') return this.send('/api/requests', 'POST', body);
    if (typeof id !== 'string' || !id) throw new ApiError(422, 'VALIDATION', 'Choose a repair request or workshop first.');
    const encoded = encodeURIComponent(id);
    if (operation === 'approve') return this.send(`/api/admin/workshops/${encoded}/approve`, 'POST', {});
    const root = `/api/requests/${encoded}`;
    if (operation === 'offer') return this.send(`${root}/offers`, 'POST', { terms: body.terms });
    if (operation === 'withdraw') return this.send(`${root}/offers/mine`, 'DELETE', {});
    if (operation === 'select') return this.send(`${root}/select`, 'POST', { offerId: body.offerId });
    if (operation === 'revise') return this.send(`${root}/revision`, 'POST', { terms: body.terms });
    const suffix: Partial<Record<Operation, string>> = { acceptRevision: 'accept-revision', rejectRevision: 'reject-revision', start: 'start', ready: 'ready', complete: 'complete', cancel: 'cancel' };
    if (!suffix[operation]) throw new ApiError(422, 'VALIDATION', 'Unsupported action.');
    return this.send(`${root}/${suffix[operation]}`, 'POST', {});
  }
}

export const apiService = new ApiService();
