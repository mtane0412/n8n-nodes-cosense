/**
 * Cosenseノードのユニットテスト
 */
import { NodeApiError } from 'n8n-workflow';
import { Cosense } from '../Cosense.node';

// CosenseApiClientをモック
jest.mock('../CosenseApiClient');
import { CosenseApiClient } from '../CosenseApiClient';

// CosenseApiClientのモック
const mockGetPage = jest.fn();
const mockListPages = jest.fn();
const mockSearchPages = jest.fn();
const mockCreatePage = jest.fn();
const mockInsertLines = jest.fn();

(CosenseApiClient as jest.MockedClass<typeof CosenseApiClient>).mockImplementation(() => ({
	getPage: mockGetPage,
	listPages: mockListPages,
	searchPages: mockSearchPages,
	createPage: mockCreatePage,
	insertLines: mockInsertLines,
} as any));

describe('Cosense Node', () => {
	let mockExecuteFunctions: any;
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
		};

		cosenseNode = new Cosense();

		// デフォルトのモック値設定
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			projectName: 'test-project',
			sessionId: 'test-session-id',
		});
		mockExecuteFunctions.getNode.mockReturnValue({ 
			id: 'test-node-id',
			name: 'Cosense',
			type: 'cosense',
			typeVersion: 1,
			position: [0, 0],
			parameters: {}
		});
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	beforeEach(() => {
		// モックをリセット
		mockGetPage.mockReset();
		mockListPages.mockReset();
		mockSearchPages.mockReset();
		mockCreatePage.mockReset();
		mockInsertLines.mockReset();
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
			mockGetPage.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockGetPage).toHaveBeenCalledWith(pageTitle);
			expect(result).toEqual([[{
				json: mockResponse,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should handle error for non-existent page', async () => {
			const pageTitle = 'Non-existent Page';
			const error = new NodeApiError(
				{ id: 'test-node-id', name: 'Cosense', type: 'cosense', typeVersion: 1, position: [0, 0], parameters: {} },
				{},
				{ message: `Page "${pageTitle}" not found` }
			);

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(pageTitle);
			mockGetPage.mockRejectedValue(error);

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
			mockListPages.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockListPages).toHaveBeenCalledWith(limit, skip);

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
			mockSearchPages.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockSearchPages).toHaveBeenCalledWith(query, 'title', limit);

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
			mockSearchPages.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockSearchPages).toHaveBeenCalledWith(query, 'fulltext', limit);

			expect(result).toEqual([[
				{ json: mockResponse[0], pairedItem: { item: 0 } },
			]]);
		});
	});

	describe('Create Page operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce('create'); // operation
		});

		test('should create a page successfully', async () => {
			const title = 'New Page';
			const content = 'Line 1\nLine 2\nLine 3';
			const mockResponse = {
				title,
				lines: ['Line 1', 'Line 2', 'Line 3'],
				id: '123456',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(title) // createPageTitle
				.mockReturnValueOnce(content); // content
			mockCreatePage.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockCreatePage).toHaveBeenCalledWith({
				title,
				lines: ['Line 1', 'Line 2', 'Line 3'],
			});
			expect(result).toEqual([[{
				json: mockResponse,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should add title as first line if content is empty', async () => {
			const title = 'New Page';
			const content = '';
			const mockResponse = {
				title,
				lines: [title],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(title)
				.mockReturnValueOnce(content);
			mockCreatePage.mockResolvedValue(mockResponse);

			await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockCreatePage).toHaveBeenCalledWith({
				title,
				lines: [title],
			});
		});
	});

	describe('Insert Lines operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce('insertLines'); // operation
		});

		test('should insert lines successfully', async () => {
			const pageTitle = 'Existing Page';
			const lineNumber = 1;
			const text = 'Inserted Line 1\nInserted Line 2';
			const mockResponse = {
				title: pageTitle,
				lines: ['Original Line 1', 'Original Line 2', 'Inserted Line 1', 'Inserted Line 2', 'Original Line 3'],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pageTitle) // insertPageTitle
				.mockReturnValueOnce(lineNumber) // lineNumber
				.mockReturnValueOnce(text); // insertText
			mockInsertLines.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockInsertLines).toHaveBeenCalledWith(pageTitle, { lineNumber, text });
			expect(result).toEqual([[{
				json: mockResponse,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should handle insert at beginning (line 0)', async () => {
			const pageTitle = 'Test Page';
			const lineNumber = 0;
			const text = 'First Line';
			const mockResponse = {
				title: pageTitle,
				lines: ['First Line', 'Original Line 1'],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pageTitle)
				.mockReturnValueOnce(lineNumber)
				.mockReturnValueOnce(text);
			mockInsertLines.mockResolvedValue(mockResponse);

			await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockInsertLines).toHaveBeenCalledWith(pageTitle, { lineNumber, text });
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

			mockGetPage.mockResolvedValue({ title: 'Public Page' });

			await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockGetPage).toHaveBeenCalledWith('Public Page');
		});

		test('should handle authentication error', async () => {
			const error = new NodeApiError(
				{ id: 'test-node-id', name: 'Cosense', type: 'cosense', typeVersion: 1, position: [0, 0], parameters: {} },
				{},
				{ message: 'Authentication failed' }
			);

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page')
				.mockReturnValueOnce('create')
				.mockReturnValueOnce('Private Page')
				.mockReturnValueOnce('Content');
			mockCreatePage.mockRejectedValue(error);

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
			mockGetPage.mockRejectedValue(error);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{
				json: { error: 'Some error' },
				error,
				pairedItem: { item: 0 },
			}]]);
		});
	});
});