/**
 * CosenseApiClientのユニットテスト
 */
import { CosenseApiClient } from '../CosenseApiClient';
import type { INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// WebSocketクライアントをモック
jest.mock('../CosenseWebSocketClient');

describe('CosenseApiClient', () => {
	let mockExecuteFunctions: any;
	let mockNode: INode;
	let apiClient: CosenseApiClient;

	beforeEach(() => {
		mockNode = {
			id: 'test-node-id',
			name: 'Cosense',
			type: 'cosense',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue(mockNode),
			helpers: {
				httpRequest: jest.fn(),
			},
		} as any;

		apiClient = new CosenseApiClient(
			mockExecuteFunctions,
			{ projectName: 'test-project', sessionId: 'test-session' },
			0
		);
	});

	describe('getPage', () => {
		it('should get a page successfully', async () => {
			const mockResponse = {
				title: 'Test Page',
				lines: ['Line 1', 'Line 2'],
				id: '123',
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.getPage('Test Page');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Test%20Page',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});

		it('should throw NodeApiError for 404', async () => {
			const error = new Error('Not found');
			(error as any).response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getPage('Non-existent')).rejects.toThrow(NodeApiError);
		});
	});

	describe('createPage', () => {
		it('should create a page successfully', async () => {
			const mockPageResponse = {
				title: 'New Page',
				lines: ['New Page', 'Title', 'Content'],
				id: '456',
			};

			// WebSocket実装では、作成後にページを取得するため
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPageResponse);

			const result = await apiClient.createPage({
				title: 'New Page',
				lines: ['Title', 'Content'],
			});

			// ページ取得のみが呼ばれることを確認
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/New%20Page',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockPageResponse);
		});

		it('should throw error when no session ID', async () => {
			apiClient = new CosenseApiClient(
				mockExecuteFunctions,
				{ projectName: 'test-project' },
				0
			);

			await expect(apiClient.createPage({
				title: 'New Page',
				lines: ['Content'],
			})).rejects.toThrow(NodeApiError);
		});
	});

	describe('insertLines', () => {
		it('should insert lines successfully', async () => {
			const updatedPage = {
				title: 'Test Page',
				lines: ['Line 1', 'Inserted Line', 'Line 2', 'Line 3'],
			};

			// WebSocket実装では、最後にページを取得するため
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(updatedPage);

			const result = await apiClient.insertLines('Test Page', {
				lineNumber: 0,
				text: 'Inserted Line',
			});

			// ページ取得のみが呼ばれることを確認
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Test%20Page',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(updatedPage);
		});

		it('should handle multi-line insert', async () => {
			const updatedPage = {
				title: 'Test Page',
				lines: ['Line A', 'Line B', 'Line C', 'Line 1'],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(updatedPage);

			const result = await apiClient.insertLines('Test Page', {
				lineNumber: 0,
				text: 'Line A\nLine B\nLine C',
			});

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Test%20Page',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(updatedPage);
		});
	});

	describe('listPages', () => {
		it('should list pages with pagination', async () => {
			const mockResponse = [
				{ title: 'Page 1' },
				{ title: 'Page 2' },
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.listPages(10, 5);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project?limit=10&skip=5',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe('searchPages', () => {
		it('should search by title', async () => {
			const mockResponse = [
				{ title: 'Match 1' },
				{ title: 'Match 2' },
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.searchPages('test', 'title');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/search/titles?q=test',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});

		it('should search full text', async () => {
			const mockResponse = [
				{ title: 'Match 1' },
				{ title: 'Match 2' },
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.searchPages('query', 'fulltext', 100);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/search/query?q=query&limit=100',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe('Service Account authentication', () => {
		beforeEach(() => {
			apiClient = new CosenseApiClient(
				mockExecuteFunctions,
				{
					projectName: 'test-project',
					authenticationType: 'serviceAccount',
					serviceAccountKey: 'test-service-key',
				},
				0
			);
		});

		it('should use service account header for GET requests', async () => {
			const mockResponse = {
				title: 'Test Page',
				lines: ['Line 1', 'Line 2'],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			await apiClient.getPage('Test Page');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Test%20Page',
				json: true,
				headers: {
					'x-service-account-access-key': 'test-service-key',
				},
			});
		});

		it('should throw error when trying to create page with service account', async () => {
			await expect(apiClient.createPage({
				title: 'New Page',
				lines: ['Content'],
			})).rejects.toThrow('Service Account authentication does not support write operations');
		});

		it('should throw error when trying to insert lines with service account', async () => {
			await expect(apiClient.insertLines('Test Page', {
				lineNumber: 0,
				text: 'New line',
			})).rejects.toThrow('Service Account authentication does not support write operations');
		});
	});
});