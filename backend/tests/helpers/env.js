export const TEMPLATE_DB = 'thaitu_test_tpl';
/** URL máy chủ Postgres cho test (không kèm tên DB). */
export const baseUrl = () => (process.env.TEST_PG_URL || 'postgres://postgres:postgres@localhost:5432').replace(/\/$/, '');
export const JWT_SECRET = 'test-secret-0123456789-abcdefghijklmnopqrstuvwxyz';
export const DEMO = { email: 'minhanh@demo.thaitu.vn', password: 'Demo@1234', id: '00000000-0000-4000-8000-000000000001' };
export const ADMIN = { email: 'admin@thaitu.vn', password: 'Admin@1234', id: '00000000-0000-4000-a000-000000000001' };
export const OTHER = { email: 'khach2@demo.thaitu.vn', password: 'Demo@1234', id: '00000000-0000-4000-8000-000000000002' };
