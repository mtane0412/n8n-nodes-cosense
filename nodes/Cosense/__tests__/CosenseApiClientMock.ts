/**
 * CosenseApiClientの完全なモック実装
 */

export const createMockApiClient = () => {
	return {
		getPage: jest.fn(),
		listPages: jest.fn(),
		searchPagesByTitle: jest.fn(),
		searchPagesByFullText: jest.fn(),
		createPage: jest.fn(),
		insertLines: jest.fn(),
		getPageIdByTitle: jest.fn(),
		getPageSnapshots: jest.fn(),
		getPageSnapshotByTimestamp: jest.fn(),
		getPageCommits: jest.fn(),
		listAllPages: jest.fn(),
		getCodeBlocks: jest.fn(),
		getTable: jest.fn(),
		getPageText: jest.fn(),
		getPageIcon: jest.fn(),
		getDeletedPage: jest.fn(),
		getSmartContext: jest.fn(),
		exportPages: jest.fn(),
		importPages: jest.fn(),
		getProjectInfo: jest.fn(),
		getProjectStorageUsage: jest.fn(),
		getProjectBackupList: jest.fn(),
		getProjectBackup: jest.fn(),
		getProjectStream: jest.fn(),
		getProjectNotifications: jest.fn(),
		getProjectInvitations: jest.fn(),
		getProjectFeed: jest.fn(),
		searchProjects: jest.fn(),
		searchWatchList: jest.fn(),
		getUserInfo: jest.fn(),
		getProjects: jest.fn(),
		getSnapshot: jest.fn(),
		getTimestampIds: jest.fn(),
		searchPages: jest.fn(), // 旧メソッド名も含める
	};
};