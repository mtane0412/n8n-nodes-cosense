/**
 * CosenseApiClientの新機能テスト
 */
import { CosenseApiClient } from '../CosenseApiClient';
import type { IExecuteFunctions } from 'n8n-workflow';

jest.mock('../CosenseWebSocketClient');

describe('CosenseApiClient - New Features', () => {
	let apiClient: CosenseApiClient;
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({}),
			helpers: {
				httpRequest: jest.fn(),
			},
		};

		apiClient = new CosenseApiClient(
			mockExecuteFunctions as IExecuteFunctions,
			{
				projectName: 'test-project',
				authenticationType: 'sessionCookie',
				sessionId: 'test-session',
			},
			0,
		);
	});

	describe('listAllPages', () => {
		it('should fetch all pages with pagination', async () => {
			const page1 = Array(100).fill(null).map((_, i) => ({ title: `Page ${i}` }));
			const page2 = Array(50).fill(null).map((_, i) => ({ title: `Page ${i + 100}` }));

			mockExecuteFunctions.helpers.httpRequest
				.mockResolvedValueOnce(page1)
				.mockResolvedValueOnce(page2);

			const result = await apiClient.listAllPages();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(150);
		});
	});

	describe('getCodeBlocks', () => {
		it('should extract code blocks from page', async () => {
			const mockPage = {
				title: 'Test Page',
				lines: [
					'Title',
					'Some text',
					'code:javascript',
					' const x = 1;',
					' console.log(x);',
					'More text',
					'code:python',
					' print("hello")',
					'End',
				],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPage);

			const result = await apiClient.getCodeBlocks('Test Page');

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				language: 'javascript',
				code: 'const x = 1;\nconsole.log(x);',
				startLine: 3,
				endLine: 4,
			});
			expect(result[1]).toEqual({
				language: 'python',
				code: 'print("hello")',
				startLine: 7,
				endLine: 7,
			});
		});
	});

	describe('exportPages', () => {
		it('should export all pages', async () => {
			const mockPages = [
				{ title: 'Page 1', lines: ['content'] },
				{ title: 'Page 2', lines: ['content'] },
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPages);

			const result = await apiClient.exportPages();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project?limit=10000',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockPages);
		});
	});

	describe('getTimestampIds', () => {
		it('should get timestamp IDs for a page', async () => {
			const mockTimestamps = [
				{ id: '123456', updated: 1234567890 },
				{ id: '789012', updated: 1234567900 },
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockTimestamps);

			const result = await apiClient.getTimestampIds('Test Page');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Test%20Page/timestamps',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockTimestamps);
		});
	});

	describe('getSnapshot', () => {
		it('should get page snapshot', async () => {
			const mockSnapshot = {
				title: 'Test Page',
				lines: ['Old content'],
				timestamp: '123456',
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockSnapshot);

			const result = await apiClient.getSnapshot('Test Page', '123456');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Test%20Page/123456',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockSnapshot);
		});
	});
});