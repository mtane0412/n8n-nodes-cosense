/**
 * Cosense統合テスト
 * 実際のCosense APIとの通信をテスト
 * 
 * 実行方法:
 * 1. .env.exampleを.envにコピー
 * 2. .envファイルに実際の認証情報を設定
 * 3. npm run test:integration を実行
 */

import { CosenseApiTestClient } from '../../CosenseApiTestClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// 環境変数の存在チェック
const hasSessionAuth = !!(process.env.COSENSE_PROJECT_NAME && process.env.COSENSE_SID);
const hasServiceAccountAuth = !!(process.env.COSENSE_PROJECT_NAME && process.env.COSENSE_SERVICE_ACCOUNT_KEY);

// いずれかの認証情報がない場合はテストをスキップ
const shouldSkipTests = !hasSessionAuth && !hasServiceAccountAuth;

(shouldSkipTests ? describe.skip : describe)('Cosense Integration Tests', () => {
	let sessionClient: CosenseApiTestClient | undefined;
	let serviceAccountClient: CosenseApiTestClient | undefined;
	const testPageTitle = process.env.COSENSE_TEST_PAGE_TITLE || 'test-page-from-n8n';
	const testProjectName = process.env.COSENSE_PROJECT_NAME || '';
	const timestamp = new Date().toISOString();

	beforeAll(() => {
		if (hasSessionAuth) {
			sessionClient = new CosenseApiTestClient({
				authType: 'sessionCookie',
				projectName: testProjectName,
				sessionId: process.env.COSENSE_SID!,
			});
		}

		if (hasServiceAccountAuth) {
			serviceAccountClient = new CosenseApiTestClient({
				authType: 'serviceAccount',
				projectName: testProjectName,
				serviceAccountKey: process.env.COSENSE_SERVICE_ACCOUNT_KEY!,
			});
		}
	});

	describe('Read Operations', () => {
		(hasSessionAuth ? describe : describe.skip)('Session Cookie Authentication', () => {
			it('should list pages', async () => {
				const result = await sessionClient!.listPages({ limit: 10 });
				expect(result).toHaveProperty('pages');
				expect(Array.isArray(result.pages)).toBe(true);
				expect(result.pages.length).toBeLessThanOrEqual(10);
			});

			it('should search pages by title', async () => {
				const result = await sessionClient!.searchPagesByTitle({ query: 'test' });
				expect(result).toHaveProperty('pages');
				expect(Array.isArray(result.pages)).toBe(true);
			});

			it('should search pages by full text', async () => {
				const result = await sessionClient!.searchPagesByQuery({ query: 'test' });
				expect(result).toHaveProperty('pages');
				expect(Array.isArray(result.pages)).toBe(true);
			});
		});

		(hasServiceAccountAuth ? describe : describe.skip)('Service Account Authentication', () => {
			it('should list pages', async () => {
				const result = await serviceAccountClient!.listPages({ limit: 10 });
				expect(result).toHaveProperty('pages');
				expect(Array.isArray(result.pages)).toBe(true);
				expect(result.pages.length).toBeLessThanOrEqual(10);
			});

			it('should search pages by title', async () => {
				const result = await serviceAccountClient!.searchPagesByTitle({ query: 'test' });
				expect(result).toHaveProperty('pages');
				expect(Array.isArray(result.pages)).toBe(true);
			});

			it('should search pages by full text', async () => {
				const result = await serviceAccountClient!.searchPagesByQuery({ query: 'test' });
				expect(result).toHaveProperty('pages');
				expect(Array.isArray(result.pages)).toBe(true);
			});
		});
	});

	(hasSessionAuth ? describe : describe.skip)('Write Operations (Session Cookie Only)', () => {
		const uniqueTestPageTitle = `${testPageTitle}-${timestamp}`;

		it('should create a new page', async () => {
			const content = `Test page created by n8n integration test\nTimestamp: ${timestamp}`;
			const result = await sessionClient!.createPage({
				title: uniqueTestPageTitle,
				body: content,
			});
			
			expect(result).toHaveProperty('title', uniqueTestPageTitle);
			expect(result).toHaveProperty('lines');
			expect(result.lines).toContain(uniqueTestPageTitle);
		});

		it('should get the created page', async () => {
			const result = await sessionClient!.getPage({ title: uniqueTestPageTitle });
			expect(result).toHaveProperty('title', uniqueTestPageTitle);
			expect(result).toHaveProperty('lines');
			expect(Array.isArray(result.lines)).toBe(true);
		});

		it('should insert lines to the page', async () => {
			const insertText = `\nInserted line at ${new Date().toISOString()}`;
			const result = await sessionClient!.insertLines({
				title: uniqueTestPageTitle,
				lineNumber: 1,
				text: insertText,
			});
			
			expect(result).toHaveProperty('title', uniqueTestPageTitle);
			expect(result).toHaveProperty('lines');
			const lines = result.lines as string[];
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.some((line: string) => line.includes('Inserted line'))).toBe(true);
		});

		it('should handle page not found error', async () => {
			await expect(
				sessionClient!.getPage({ title: 'this-page-definitely-does-not-exist-12345' })
			).rejects.toThrow('Page not found');
		});

		it('should handle duplicate page creation error', async () => {
			await expect(
				sessionClient!.createPage({
					title: uniqueTestPageTitle,
					body: 'Duplicate content',
				})
			).rejects.toThrow('already exists');
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid authentication', async () => {
			const invalidClient = new CosenseApiTestClient({
				authType: 'sessionCookie',
				projectName: testProjectName,
				sessionId: 'invalid-session-id',
			});

			await expect(
				invalidClient.listPages({ limit: 10 })
			).rejects.toThrow();
		});
	});
});

// カスタムテストランナー設定
if (shouldSkipTests) {
	console.log('\n⚠️  Integration tests skipped: No authentication credentials found in .env file');
	console.log('To run integration tests:');
	console.log('1. Copy .env.example to .env');
	console.log('2. Fill in your Cosense credentials');
	console.log('3. Run: npm run test:integration\n');
}