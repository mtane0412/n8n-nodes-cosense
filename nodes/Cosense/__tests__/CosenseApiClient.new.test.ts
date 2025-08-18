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

			const result = await apiClient.listAllPages('test-project');

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

			const result = await apiClient.getCodeBlocks('test-project', 'Test Page');

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

			const result = await apiClient.exportPages('test-project');

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

			const result = await apiClient.getTimestampIds('test-project', 'Test Page');

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

			const result = await apiClient.getSnapshot('test-project', 'Test Page', '123456');

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

	describe('getProjectNotifications', () => {
		it('should get project notifications', async () => {
			const mockNotifications = {
				projectName: 'test-project',
				notifications: [
					{
						id: 'notif1',
						type: 'pageUpdate',
						user: { id: 'user1', name: 'User 1' },
						page: { title: 'Updated Page' },
						timestamp: 1234567890,
					},
					{
						id: 'notif2',
						type: 'userJoin',
						user: { id: 'user2', name: 'User 2' },
						timestamp: 1234567900,
					},
				],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockNotifications);

			const result = await apiClient.getProjectNotifications('test-project');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/projects/test-project/notifications',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockNotifications);
		});

		it('should handle authentication types correctly', async () => {
			const serviceAccountClient = new CosenseApiClient(
				mockExecuteFunctions as IExecuteFunctions,
				{
					authenticationType: 'serviceAccount',
					serviceAccountKey: 'test-key',
				},
				0,
			);

			const mockData = { notifications: [] };
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockData);

			await serviceAccountClient.getProjectNotifications('test-project');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/projects/test-project/notifications',
				json: true,
				headers: {
					'x-service-account-access-key': 'test-key',
				},
			});
		});
	});

	describe('getProjectInvitations', () => {
		it('should get project invitations', async () => {
			const mockInvitations = {
				projectName: 'test-project',
				invitations: [
					{
						id: 'inv1',
						email: 'user@example.com',
						invitedBy: { id: 'user1', name: 'Admin' },
						status: 'pending',
						createdAt: 1234567890,
					},
					{
						id: 'inv2',
						email: 'another@example.com',
						invitedBy: { id: 'user1', name: 'Admin' },
						status: 'accepted',
						createdAt: 1234567900,
					},
				],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockInvitations);

			const result = await apiClient.getProjectInvitations('test-project');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/projects/test-project/invitations',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockInvitations);
		});
	});

	describe('getDeletedPage', () => {
		it('should get deleted page information', async () => {
			const mockDeletedPage = {
				id: 'page123',
				title: 'Deleted Page',
				deletedAt: 1234567890,
				deletedBy: { id: 'user1', name: 'User 1' },
				lines: ['Content of the deleted page'],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockDeletedPage);

			const result = await apiClient.getDeletedPage('test-project', 'page123');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/deleted-pages/test-project/page123',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockDeletedPage);
		});

		it('should handle 404 error for non-existent deleted page', async () => {
			const error: any = new Error('Not Found');
			error.response = { statusCode: 404 };
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(error);

			await expect(apiClient.getDeletedPage('test-project', 'nonexistent')).rejects.toThrow();
		});
	});

	describe('getProjectFeed', () => {
		it('should get project feed', async () => {
			const mockFeed = {
				projectName: 'test-project',
				feed: [
					{
						id: 'feed1',
						type: 'pageCreate',
						user: { id: 'user1', name: 'User 1' },
						page: { title: 'New Page' },
						timestamp: 1234567890,
					},
					{
						id: 'feed2',
						type: 'pageUpdate',
						user: { id: 'user2', name: 'User 2' },
						page: { title: 'Updated Page' },
						timestamp: 1234567900,
					},
				],
			};

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockFeed);

			const result = await apiClient.getProjectFeed('test-project');

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://scrapbox.io/api/feed/test-project',
				json: true,
				headers: {
					Cookie: 'connect.sid=test-session',
				},
			});
			expect(result).toEqual(mockFeed);
		});
	});
});