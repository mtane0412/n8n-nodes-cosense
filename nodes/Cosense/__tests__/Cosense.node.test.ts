/**
 * Cosenseノードのユニットテスト
 */
import { NodeApiError } from 'n8n-workflow';
import { Cosense } from '../Cosense.node';

// CosenseWebSocketClientをモック
jest.mock('../CosenseWebSocketClient');

// CosenseApiClientをモック
jest.mock('../CosenseApiClient');
import { CosenseApiClient } from '../CosenseApiClient';
import { createMockApiClient } from './CosenseApiClientMock';

describe('Cosense Node', () => {
	let mockExecuteFunctions: any;
	let cosenseNode: Cosense;

	let mockApiClient: ReturnType<typeof createMockApiClient>;

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
				returnJsonArray: jest.fn().mockImplementation((data) => {
					if (Array.isArray(data)) {
						return data.map((item, index) => ({
							json: item,
							pairedItem: { item: 0 },
						}));
					}
					return [{ json: data, pairedItem: { item: 0 } }];
				}),
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
		
		// CosenseApiClientのモックをリセット
		jest.clearAllMocks();
		mockApiClient = createMockApiClient();
		(CosenseApiClient as jest.MockedClass<typeof CosenseApiClient>).mockImplementation((executeFunctions, credentials, itemIndex) => mockApiClient as any);
	});

	describe('Get Page operation', () => {

		test('should get a page successfully', async () => {
			const pageTitle = 'Test Page';
			const projectName = 'test-project';
			const mockResponse = {
				title: pageTitle,
				lines: ['line1', 'line2'],
				created: 1234567890,
				updated: 1234567891,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('get') // operation
				.mockReturnValueOnce(pageTitle); // pageTitle
			mockApiClient.getPage.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.getPage).toHaveBeenCalledWith(projectName, pageTitle);
			expect(result).toEqual([[{
				json: mockResponse,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should handle error for non-existent page', async () => {
			const pageTitle = 'Non-existent Page';
			const projectName = 'test-project';
			const error = new NodeApiError(
				{ id: 'test-node-id', name: 'Cosense', type: 'cosense', typeVersion: 1, position: [0, 0], parameters: {} },
				{},
				{ message: `Page "${pageTitle}" not found` }
			);

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('get') // operation
				.mockReturnValueOnce(pageTitle); // pageTitle
			mockApiClient.getPage.mockRejectedValue(error);

			await expect(cosenseNode.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
		});
	});

	describe('List Pages operation', () => {

		test('should list pages successfully', async () => {
			const limit = 10;
			const projectName = 'test-project';
			const mockResponse = [
				{ title: 'Page 1', updated: 1234567890 },
				{ title: 'Page 2', updated: 1234567891 },
			];

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('list') // operation
				.mockReturnValueOnce(false) // returnAll
				.mockReturnValueOnce(limit); // limit
			mockApiClient.listPages.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.listPages).toHaveBeenCalledWith(projectName, limit, 0);

			expect(result).toEqual([[
				{ json: mockResponse[0], pairedItem: { item: 0 } },
				{ json: mockResponse[1], pairedItem: { item: 0 } },
			]]);
		});
	});

	describe('Search Pages operation', () => {

		test('should search pages by title successfully', async () => {
			const projectName = 'test-project';
			const query = 'test query';
			const limit = 50;
			const mockResponse = [
				{ title: 'Test Page 1', updated: 1234567890 },
				{ title: 'Test Page 2', updated: 1234567891 },
			];

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('searchPageTitles') // operation
				.mockReturnValueOnce(query) // titleQuery
				.mockReturnValueOnce(limit); // titleSearchLimit
			mockApiClient.searchPagesByTitle.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.searchPagesByTitle).toHaveBeenCalledWith(projectName, query, limit);

			expect(result).toEqual([[
				{ json: mockResponse[0], pairedItem: { item: 0 } },
				{ json: mockResponse[1], pairedItem: { item: 0 } },
			]]);
		});

		test('should search pages by full text successfully', async () => {
			const query = 'test query';
			const projectName = 'test-project';
			const mockResponse = [
				{ title: 'Test Page 1', lines: ['content with test query'], updated: 1234567890 },
			];

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('searchByFullText') // operation
				.mockReturnValueOnce(query); // fullTextQuery
			
			mockApiClient.searchPagesByFullText.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.searchPagesByFullText).toHaveBeenCalledWith(projectName, query);

			expect(result).toEqual([[
				{ json: mockResponse[0], pairedItem: { item: 0 } },
			]]);
		});
	});

	describe('Create Page operation', () => {

		test('should create a page successfully', async () => {
			const projectName = 'test-project';
			const title = 'New Page';
			const content = 'Line 1\nLine 2\nLine 3';
			const mockResponse = {
				title,
				lines: ['Line 1', 'Line 2', 'Line 3'],
				id: '123456',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce(title) // createPageTitle
				.mockReturnValueOnce(content); // content
			mockApiClient.createPage.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.createPage).toHaveBeenCalledWith(projectName, {
				title,
				lines: [title, 'Line 1', 'Line 2', 'Line 3'],
			});
			expect(result).toEqual([[{
				json: mockResponse,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should add title as first line if content is empty', async () => {
			const projectName = 'test-project';
			const title = 'New Page';
			const content = '';
			const mockResponse = {
				title,
				lines: [title],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce(title) // createPageTitle
				.mockReturnValueOnce(content); // content
			mockApiClient.createPage.mockResolvedValue(mockResponse);

			await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.createPage).toHaveBeenCalledWith(projectName, {
				title,
				lines: [title],
			});
		});
	});

	describe('Insert Lines operation', () => {

		test('should insert lines successfully', async () => {
			const projectName = 'test-project';
			const pageTitle = 'Existing Page';
			const lineNumber = 1;
			const text = 'Inserted Line 1\nInserted Line 2';
			const mockResponse = {
				title: pageTitle,
				lines: ['Original Line 1', 'Original Line 2', 'Inserted Line 1', 'Inserted Line 2', 'Original Line 3'],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('insertLines') // operation
				.mockReturnValueOnce(pageTitle) // insertPageTitle
				.mockReturnValueOnce(lineNumber) // lineNumber
				.mockReturnValueOnce(text); // insertText
			mockApiClient.insertLines.mockResolvedValue(mockResponse);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.insertLines).toHaveBeenCalledWith(projectName, pageTitle, { lineNumber, text });
			expect(result).toEqual([[{
				json: mockResponse,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should handle insert at beginning (line 0)', async () => {
			const projectName = 'test-project';
			const pageTitle = 'Test Page';
			const lineNumber = 0;
			const text = 'First Line';
			const mockResponse = {
				title: pageTitle,
				lines: ['First Line', 'Original Line 1'],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('insertLines') // operation
				.mockReturnValueOnce(pageTitle) // insertPageTitle
				.mockReturnValueOnce(lineNumber) // lineNumber
				.mockReturnValueOnce(text); // insertText
			mockApiClient.insertLines.mockResolvedValue(mockResponse);

			await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.insertLines).toHaveBeenCalledWith(projectName, pageTitle, { lineNumber, text });
		});
	});

	describe('Authentication', () => {
		test('should work without session ID for public pages', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				projectName: 'test-project',
				sessionId: '',
			});
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce('test-project') // projectName
				.mockReturnValueOnce('get') // operation
				.mockReturnValueOnce('Public Page'); // pageTitle

			mockApiClient.getPage.mockResolvedValue({ title: 'Public Page' });

			await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.getPage).toHaveBeenCalledWith('test-project', 'Public Page');
		});

		test('should handle authentication error', async () => {
			const error = new NodeApiError(
				{ id: 'test-node-id', name: 'Cosense', type: 'cosense', typeVersion: 1, position: [0, 0], parameters: {} },
				{},
				{ message: 'Authentication failed' }
			);

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce('test-project') // projectName
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Private Page') // createPageTitle
				.mockReturnValueOnce('Content'); // content
			mockApiClient.createPage.mockRejectedValue(error);

			await expect(cosenseNode.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
		});
	});

	describe('Error handling', () => {
		test('should continue on fail when enabled', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			const projectName = 'test-project';
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('get') // operation
				.mockReturnValueOnce('Error Page'); // pageTitle

			const error = new Error('Some error');
			mockApiClient.getPage.mockRejectedValue(error);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{
				json: { error: 'Some error' },
				error,
				pairedItem: { item: 0 },
			}]]);
		});
	});

	describe('History operations', () => {
		test('should get page snapshots', async () => {
			const pageTitle = 'History Page';
			const pageId = 'page123';
			const mockSnapshots = [
				{ id: 'snap1', created: 1234567890 },
				{ id: 'snap2', created: 1234567900 },
			];

			const projectName = 'test-project';
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('getSnapshots') // operation
				.mockReturnValueOnce(pageTitle); // pageTitle

			mockApiClient.getPageIdByTitle.mockResolvedValue(pageId);
			mockApiClient.getPageSnapshots.mockResolvedValue(mockSnapshots);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.getPageIdByTitle).toHaveBeenCalledWith(projectName, pageTitle);
			expect(mockApiClient.getPageSnapshots).toHaveBeenCalledWith(projectName, pageId);
			expect(result).toEqual([[
				{ json: mockSnapshots[0], pairedItem: { item: 0 } },
				{ json: mockSnapshots[1], pairedItem: { item: 0 } },
			]]);
		});

		test('should get specific page snapshot', async () => {
			const pageTitle = 'History Page';
			const pageId = 'page123';
			const timestampId = 'timestamp123';
			const mockSnapshot = { id: 'snap1', lines: ['content'] };

			const projectName = 'test-project';
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('getSnapshot') // operation
				.mockReturnValueOnce(pageTitle) // pageTitle
				.mockReturnValueOnce(timestampId); // timestampId

			mockApiClient.getPageIdByTitle.mockResolvedValue(pageId);
			mockApiClient.getPageSnapshotByTimestamp.mockResolvedValue(mockSnapshot);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.getPageIdByTitle).toHaveBeenCalledWith(projectName, pageTitle);
			expect(mockApiClient.getPageSnapshotByTimestamp).toHaveBeenCalledWith(projectName, pageId, timestampId);
			expect(result).toEqual([[{
				json: mockSnapshot,
				pairedItem: { item: 0 },
			}]]);
		});

		test('should get page commits', async () => {
			const pageTitle = 'History Page';
			const pageId = 'page123';
			const mockCommits = [
				{ id: 'commit1', message: 'First commit' },
				{ id: 'commit2', message: 'Second commit' },
			];

			const projectName = 'test-project';
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('page') // resource
				.mockReturnValueOnce(projectName) // projectName
				.mockReturnValueOnce('getCommits') // operation
				.mockReturnValueOnce(pageTitle); // pageTitle

			mockApiClient.getPageIdByTitle.mockResolvedValue(pageId);
			mockApiClient.getPageCommits.mockResolvedValue(mockCommits);

			const result = await cosenseNode.execute.call(mockExecuteFunctions);

			expect(mockApiClient.getPageIdByTitle).toHaveBeenCalledWith(projectName, pageTitle);
			expect(mockApiClient.getPageCommits).toHaveBeenCalledWith(projectName, pageId);
			expect(result).toEqual([[
				{ json: mockCommits[0], pairedItem: { item: 0 } },
				{ json: mockCommits[1], pairedItem: { item: 0 } },
			]]);
		});
	});
});