import { it, expect, vi } from 'vitest';
import { ApiService, ApiError } from './api-service';
import type { Operation } from './service';
const workspace = { me: null, users: [], requests: [], offers: [], csrfToken: 'server-csrf' };
const response = (data: unknown = workspace, status = 200) => new Response(JSON.stringify(data), { status });

it('restores a server session and sends cookie credentials and CSRF on mutations', async () => {
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => response());
  const service = new ApiService(transport);
  expect(await service.load()).toEqual({ me: null, users: [], requests: [], offers: [] });
  await service.act('request', { category: 'Laptop', photos: [{ id: 'local', name: 'fault.png', url: 'data:image/png;base64,AA==' }] });
  expect(transport.mock.calls[0][0]).toBe('/api/session');
  expect(transport.mock.calls[1][0]).toBe('/api/requests');
  expect(transport.mock.calls[1][1]).toMatchObject({ credentials: 'same-origin', method: 'POST', headers: { 'X-CSRF-Token': 'server-csrf' } });
  expect(JSON.parse(String(transport.mock.calls[1][1]?.body)).photos[0].name).toBe('fault.png');
});

it('maps every UI operation to the contract without leaking route ids into bodies', async () => {
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => response());
  const service = new ApiService(transport);
  await service.load();
  const cases: [Operation, string, string][] = [
    ['approve', '/api/admin/workshops/repair%2F1/approve', 'POST'],
    ['offer', '/api/requests/repair%2F1/offers', 'POST'],
    ['withdraw', '/api/requests/repair%2F1/offers/mine', 'DELETE'],
    ['select', '/api/requests/repair%2F1/select', 'POST'],
    ['revise', '/api/requests/repair%2F1/revision', 'POST'],
    ['acceptRevision', '/api/requests/repair%2F1/accept-revision', 'POST'],
    ['rejectRevision', '/api/requests/repair%2F1/reject-revision', 'POST'],
    ['start', '/api/requests/repair%2F1/start', 'POST'],
    ['ready', '/api/requests/repair%2F1/ready', 'POST'],
    ['complete', '/api/requests/repair%2F1/complete', 'POST'],
    ['cancel', '/api/requests/repair%2F1/cancel', 'POST'],
  ];
  for (const [operation, path, method] of cases) {
    await service.act(operation, { id: 'repair/1', offerId: 'offer-1', terms: { scope: 'Screen' } });
    const call = transport.mock.calls.at(-1)!;
    expect(call[0]).toBe(path);
    expect(call[1]?.method).toBe(method);
    expect(JSON.parse(String(call[1]?.body))).not.toHaveProperty('id');
  }
  await service.act('login', { email: 'test@example.test', password: 'ExampleOnly123' });
  expect(transport.mock.calls.at(-1)?.[0]).toBe('/api/auth/login');
  await service.act('register', { role: 'customer' });
  expect(transport.mock.calls.at(-1)?.[0]).toBe('/api/auth/register');
  await service.act('logout');
  expect(transport.mock.calls.at(-1)?.[0]).toBe('/api/auth/logout');
});

it('exposes auth, validation and conflict errors without falling back to fictional data', async () => {
  for (const status of [401, 403, 409, 422, 500]) {
    const transport = vi.fn<typeof fetch>().mockImplementation(async () => response({ code: 'FAIL', message: 'Actual server error' }, status));
    const service = new ApiService(transport);
    await expect(service.load()).rejects.toMatchObject({ status, code: 'FAIL', message: 'Actual server error' });
    expect(transport).toHaveBeenCalledTimes(1);
  }
});

it('reports network and malformed server responses clearly', async () => {
  const service = new ApiService(vi.fn<typeof fetch>().mockRejectedValue(Error('offline')));
  await expect(service.load()).rejects.toBeInstanceOf(ApiError);
  const malformed = new ApiService(vi.fn<typeof fetch>().mockResolvedValue(response({ html: 'wrong upstream' })));
  await expect(malformed.load()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
