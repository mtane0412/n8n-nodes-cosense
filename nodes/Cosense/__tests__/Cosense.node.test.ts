/**
 * Cosenseノードのユニットテスト
 */
import { IExecuteFunctions, INodeExecutionData, NodeApiError } from 'n8n-workflow';
import { Cosense } from '../Cosense.node';

// モックの型定義
interface MockHelpers {
	httpRequest: jest.Mock;
}

interface MockExecuteFunctions extends IExecuteFunctions {
	getInputData: jest.Mock;
	getNodeParameter: jest.Mock;
	getCredentials: jest.Mock;
	continueOnFail: jest.Mock;
	getNode: jest.Mock;
	helpers: MockHelpers;
}

describe('Cosense Node', () => {
	let mockExecuteFunctions: MockExecuteFunctions;
	let cosenseNode: Cosense;

	beforeEach(() => {
		// モックの初期化
		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			continueOnFail: jest.fn(),
			getNode: jest.fn(),
			helpers: {
				httpRequest: jest.fn(),
			},
		} as any;

		cosenseNode = new Cosense();

		// デフォルトのモック値設定
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			projectName: 'test-project',
			sessionId: 'test-session-id',
		});
		mockExecuteFunctions.getNode.mockReturnValue({ name: 'Cosense' });
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('Get Page operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce('get'); // operation
		});

		test('should get a page successfully', async () => {
			const pageTitle = 'Test Page';
			const mockResponse = {
				title: pageTitle,
				lines: ['line1', 'line2'],
				created: 1234567890,
				updated: 1234567891,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(pageTitle); // pageTitle
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: `https://scrapbox.io/api/pages/test-project/${encodeURIComponent(pageTitle)}`,
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session-id',
				},
			});

			expect(result).toEqual([[{
				json: mockResponse,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should handle 404 error for non-existent page', async () => {
			const pageTitle = 'Non-existent Page';
			const error = new Error('Not Found');
			(error as any).response = { statusCode: 404 };

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(pageTitle);
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(cosenseNode.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
		});
	});

	describe('List Pages operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce('list'); // operation
		});

		test('should list pages successfully', async () => {
			const limit = 10;
			const skip = 0;
			const mockResponse = [
				{ title: 'Page 1', updated: 1234567890 },
				{ title: 'Page 2', updated: 1234567891 },
			];

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(limit) // limit
				.mockReturnValueOnce(skip); // skip
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: `https://scrapbox.io/api/pages/test-project?limit=${limit}&skip=${skip}`,
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session-id',
				},
			});

			expect(result).toEqual([[
				{ json: mockResponse[0], pairedItem: { item: 0 } },
				{ json: mockResponse[1], pairedItem: { item: 0 } },
			]]);
		});
	});

	describe('Search Pages operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce('search'); // operation
		});

		test('should search pages by title successfully', async () => {
			const query = 'test query';
			const searchType = 'title';
			const limit = 50;
			const mockResponse = [
				{ title: 'Test Page 1', updated: 1234567890 },
				{ title: 'Test Page 2', updated: 1234567891 },
			];

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(query) // query
				.mockReturnValueOnce(searchType) // searchType
				.mockReturnValueOnce(limit); // searchLimit
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: `https://scrapbox.io/api/pages/test-project/search/titles?q=${encodeURIComponent(query)}`,
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session-id',
				},
			});

			expect(result).toEqual([[
				{ json: mockResponse[0], pairedItem: { item: 0 } },
				{ json: mockResponse[1], pairedItem: { item: 0 } },
			]]);
		});

		test('should search pages by full text successfully', async () => {
			const query = 'test query';
			const searchType = 'fulltext';
			const limit = 50;
			const mockResponse = [
				{ title: 'Test Page 1', lines: ['content with test query'], updated: 1234567890 },
			];

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(query) // query
				.mockReturnValueOnce(searchType) // searchType
				.mockReturnValueOnce(limit); // searchLimit
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: `https://scrapbox.io/api/pages/test-project/search/query?q=${encodeURIComponent(query)}&limit=${limit}`,
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session-id',
				},
			});

			expect(result).toEqual([[
				{ json: mockResponse[0], pairedItem: { item: 0 } },
			]]);
		});
	});

	describe('Authentication', () => {
		test('should work without session ID for public pages', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				projectName: 'test-project',
				sessionId: '',
			});
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('Public Page');

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({ title: 'Public Page' });

			await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Public%20Page',
				json: true,
			});
		});

		test('should handle 401 authentication error', async () => {
			const error = new Error('Unauthorized');
			(error as any).response = { statusCode: 401 };

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('Private Page');
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(cosenseNode.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
		});
	});

	describe('Error handling', () => {
		test('should continue on fail when enabled', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page')
				.mockReturnValueOnce('get')
				.mockReturnValueOnce('Error Page');

			const error = new Error('Some error');
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{
				json: { error: 'Some error' },
				error,
				pairedItem: { item: 0 },
			}]]);
		});
	});
});