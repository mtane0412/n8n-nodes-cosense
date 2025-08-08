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
	let serviceAccountApiClient: CosenseApiClient;

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

		serviceAccountApiClient = new CosenseApiClient(
			mockExecuteFunctions,
			{ 
				projectName: 'test-project', 
				authenticationType: 'serviceAccount',
				serviceAccountKey: 'test-service-account-key'
			},
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
				{ title: 'Test Match 1' },
				{ title: 'Test Match 2' },
				{ title: 'Other Page' },
				{ title: 'Another test page' },
			];

			const expectedFiltered = [
				{ title: 'Test Match 1' },
				{ title: 'Test Match 2' },
				{ title: 'Another test page' },
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.searchPages('test', 'title');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/search/titles',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(expectedFiltered);
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

	describe('getUserInfo', () => {
		it('should get user info successfully', async () => {
			const mockResponse = {
				id: 'user123',
				name: 'Test User',
				displayName: 'Test User',
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.getUserInfo();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/users/me',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});

		it('should use service account authentication', async () => {
			const mockResponse = {
				id: 'user123',
				name: 'Service Account',
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await serviceAccountApiClient.getUserInfo();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/users/me',
				json: true,
				headers: {
					'x-service-account-access-key': 'test-service-account-key',
				},
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe('getProjects', () => {
		it('should get projects list successfully', async () => {
			const mockResponse = [
				{ name: 'project1', displayName: 'Project 1' },
				{ name: 'project2', displayName: 'Project 2' },
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.getProjects();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/projects',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe('getProjectInfo', () => {
		it('should get project info successfully', async () => {
			const mockResponse = {
				name: 'test-project',
				displayName: 'Test Project',
				created: 1234567890,
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.getProjectInfo();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/projects/test-project',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});

		it('should get project info for specified project', async () => {
			const mockResponse = {
				name: 'other-project',
				displayName: 'Other Project',
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.getProjectInfo('other-project');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/projects/other-project',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe('getTable', () => {
		it('should get table data as CSV', async () => {
			const mockCsvData = 'col1,col2,col3\nval1,val2,val3';
			
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockCsvData);

			const result = await apiClient.getTable('Page With Table', 'table1');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/table/test-project/Page%20With%20Table/table1.csv',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual({
				csv: mockCsvData,
				filename: 'table1.csv',
				pageTitle: 'Page With Table',
			});
		});

		it('should handle JSON response from table API', async () => {
			const mockResponse = {
				csv: 'col1,col2\nval1,val2',
				metadata: 'some data',
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await apiClient.getTable('Page', 'table2');

			expect(result).toEqual(mockResponse);
		});

		it('should handle 404 error for non-existent table', async () => {
			const error = new Error('Not Found');
			(error as any).response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getTable('Page', 'nonexistent'))
				.rejects.toThrow('Table "nonexistent" not found in page "Page"');
		});
	});

	describe('getPageIdByTitle', () => {
		it('should get page ID from page title', async () => {
			const mockPage = {
				id: 'page123',
				title: 'Test Page',
				lines: ['Test Page', 'content'],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPage);

			const result = await apiClient.getPageIdByTitle('Test Page');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Test%20Page',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toBe('page123');
		});

		it('should throw error if page has no ID', async () => {
			const mockPage = {
				title: 'Test Page',
				lines: ['Test Page', 'content'],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPage);

			await expect(apiClient.getPageIdByTitle('Test Page'))
				.rejects.toThrow('Page ID not found for page "Test Page"');
		});
	});

	describe('getPageSnapshots', () => {
		it('should get page snapshots', async () => {
			const mockSnapshots = [
				{
					id: 'snap1',
					pageId: 'page123',
					created: 1234567890,
					lines: ['content1'],
				},
				{
					id: 'snap2',
					pageId: 'page123',
					created: 1234567900,
					lines: ['content2'],
				},
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockSnapshots);

			const result = await apiClient.getPageSnapshots('page123');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/page-snapshots/test-project/page123',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockSnapshots);
		});

		it('should handle 404 error for non-existent page', async () => {
			const error = new Error('Not Found');
			(error as any).response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getPageSnapshots('nonexistent'))
				.rejects.toThrow('Page with ID "nonexistent" not found');
		});
	});

	describe('getPageSnapshotByTimestamp', () => {
		it('should get specific page snapshot', async () => {
			const mockSnapshot = {
				id: 'snap1',
				pageId: 'page123',
				created: 1234567890,
				lines: ['content at timestamp'],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockSnapshot);

			const result = await apiClient.getPageSnapshotByTimestamp('page123', 'timestamp123');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/page-snapshots/test-project/page123/timestamp123',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockSnapshot);
		});

		it('should handle 404 error for non-existent snapshot', async () => {
			const error = new Error('Not Found');
			(error as any).response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getPageSnapshotByTimestamp('page123', 'nonexistent'))
				.rejects.toThrow('Snapshot not found for page ID "page123" at timestamp "nonexistent"');
		});
	});

	describe('getPageCommits', () => {
		it('should get page commits', async () => {
			const mockCommits = [
				{
					id: 'commit1',
					pageId: 'page123',
					userId: 'user1',
					created: 1234567890,
					message: 'Initial commit',
				},
				{
					id: 'commit2',
					pageId: 'page123',
					userId: 'user2',
					created: 1234567900,
					message: 'Update content',
				},
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockCommits);

			const result = await apiClient.getPageCommits('page123');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/commits/test-project/page123',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockCommits);
		});

		it('should handle 404 error for non-existent page', async () => {
			const error = new Error('Not Found');
			(error as any).response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getPageCommits('nonexistent'))
				.rejects.toThrow('Page with ID "nonexistent" not found');
		});

		it('should work with service account authentication', async () => {
			const mockCommits = [{ id: 'commit1', pageId: 'page123' }];
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockCommits);

			const result = await serviceAccountApiClient.getPageCommits('page123');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/commits/test-project/page123',
				json: true,
				headers: {
					'x-service-account-access-key': 'test-service-account-key',
				},
			});
			expect(result).toEqual(mockCommits);
		});
	});

	describe('getProjectBackupList', () => {
		it('should get project backup list', async () => {
			const mockBackups = [
				{
					id: 'backup1',
					created: 1234567890,
					size: 1048576,
					status: 'completed',
				},
				{
					id: 'backup2',
					created: 1234567900,
					size: 2097152,
					status: 'completed',
				},
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockBackups);

			const result = await apiClient.getProjectBackupList();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/project-backup/test-project/list',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockBackups);
		});

		it('should handle authentication error', async () => {
			const error = new Error('Unauthorized');
			(error as any).response = { statusCode: 401 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getProjectBackupList())
				.rejects.toThrow('Authentication failed');
		});
	});

	describe('getProjectBackup', () => {
		it('should get specific project backup', async () => {
			const mockBackup = {
				id: 'backup1',
				created: 1234567890,
				pages: [
					{ title: 'Page 1', lines: ['content'] },
					{ title: 'Page 2', lines: ['content'] },
				],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockBackup);

			const result = await apiClient.getProjectBackup('backup1');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/project-backup/test-project/backup1.json',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockBackup);
		});

		it('should handle 404 error for non-existent backup', async () => {
			const error = new Error('Not Found');
			(error as any).response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getProjectBackup('nonexistent'))
				.rejects.toThrow('Backup with ID "nonexistent" not found');
		});
	});

	describe('getProjectStream', () => {
		it('should get project stream', async () => {
			const mockStream = [
				{
					type: 'page-update',
					pageId: 'page123',
					userId: 'user1',
					timestamp: 1234567890,
				},
				{
					type: 'page-create',
					pageId: 'page124',
					userId: 'user2',
					timestamp: 1234567900,
				},
			];

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockStream);

			const result = await apiClient.getProjectStream();

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/stream/test-project/',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockStream);
		});
	});

	describe('getPageIcon', () => {
		it('should get page icon', async () => {
			const mockIcon = {
				url: 'https://example.com/icon.png',
				type: 'image/png',
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockIcon);

			const result = await apiClient.getPageIcon('Page With Icon');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/pages/test-project/Page%20With%20Icon/icon',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockIcon);
		});

		it('should handle 404 error for page without icon', async () => {
			const error = new Error('Not Found');
			(error as any).response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getPageIcon('Page Without Icon'))
				.rejects.toThrow('Icon not found for page "Page Without Icon"');
		});
	});
});