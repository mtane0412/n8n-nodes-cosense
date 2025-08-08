/**
 * Cosense (旧Scrapbox) のページ管理と検索機能を提供するn8nノード
 */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { CosenseApiClient, type CosenseCredentials } from './CosenseApiClient';

export class Cosense implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cosense',
		name: 'cosense',
		icon: 'file:cosense.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{($parameter["resource"] === "page" ? $parameter["operation"] : $parameter["resource"] === "project" ? $parameter["projectOperation"] : $parameter["resource"] === "history" ? $parameter["historyOperation"] : $parameter["resource"] === "exportImport" ? $parameter["exportImportOperation"] : $parameter["userOperation"]) + ": " + $parameter["resource"]}}',
		description: 'Read and write pages in Cosense (formerly Scrapbox)',
		defaults: {
			name: 'Cosense',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'cosenseApi',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Export/Import',
						value: 'exportImport',
						description: 'Export or import project data',
					},
					{
						name: 'History',
						value: 'history',
						description: 'Access page version history',
					},
					{
						name: 'Page',
						value: 'page',
						description: 'Work with individual pages',
					},
					{
						name: 'Project',
						value: 'project',
						description: 'Work with entire projects',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Work with user and project information',
					},
				],
				default: 'page',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['page'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new page or append to existing page',
						action: 'Create a page',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a page by title',
						action: 'Get a page',
					},
					{
						name: 'Get Code Blocks',
						value: 'getCodeBlocks',
						description: 'Extract all code blocks from a page',
						action: 'Get code blocks from page',
					},
					{
						name: 'Get Commits',
						value: 'getCommits',
						description: 'Get commit history for a page',
						action: 'Get page commits',
					},
					{
						name: 'Get Deleted',
						value: 'getDeleted',
						description: 'Get deleted page information',
						action: 'Get deleted page',
					},
					{
						name: 'Get Icon',
						value: 'getIcon',
						description: 'Get page icon',
						action: 'Get page icon',
					},
					{
						name: 'Get Snapshot',
						value: 'getSnapshot',
						description: 'Get a specific snapshot for a page',
						action: 'Get page snapshot',
					},
					{
						name: 'Get Snapshots',
						value: 'getSnapshots',
						description: 'Get all snapshots for a page',
						action: 'Get page snapshots',
					},
					{
						name: 'Get Table',
						value: 'getTable',
						description: 'Get table data from a page as CSV',
						action: 'Get table data',
					},
					{
						name: 'Get Text',
						value: 'getText',
						description: 'Get page content as plain text',
						action: 'Get page text',
					},
					{
						name: 'Insert Lines',
						value: 'insertLines',
						description: 'Insert text into an existing page',
						action: 'Insert lines into a page',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List pages in a project',
						action: 'List pages',
					},
					{
						name: 'Search by Full Text',
						value: 'searchByFullText',
						description: 'Search pages by content (full text search)',
						action: 'Search pages by full text',
					},
					{
						name: 'Search Page Titles',
						value: 'searchPageTitles',
						description: 'Search or list all page titles (with optional filtering)',
						action: 'Search page titles',
					},
				],
				default: 'get',
			},
			// Project Name for Page operations
			{
				displayName: 'Project Name',
				name: 'projectName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
					},
				},
				default: '',
				placeholder: 'my-project',
				description: 'The name of your Cosense/Scrapbox project',
			},
			// Get Page
			{
				displayName: 'Page Title',
				name: 'pageTitle',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['get', 'getCodeBlocks', 'getTable', 'getText', 'getSnapshots', 'getSnapshot', 'getCommits', 'getIcon'],
					},
				},
				default: '',
				placeholder: 'My Page Title',
				description: 'The title of the page to get',
			},
			// Get Deleted Page
			{
				displayName: 'Page ID',
				name: 'deletedPageId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['getDeleted'],
					},
				},
				default: '',
				placeholder: '5f1234567890abcdef123456',
				description: 'The ID of the deleted page',
			},
			// Get Table
			{
				displayName: 'Table Filename',
				name: 'tableFilename',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['getTable'],
					},
				},
				default: '',
				placeholder: 'table1',
				description: 'The filename of the table (without .csv extension)',
			},
			// List Pages
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['list'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['list'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			// Create Page
			{
				displayName: 'Page Title',
				name: 'createPageTitle',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['create'],
					},
				},
				default: '',
				placeholder: 'New Page Title',
				description: 'The title of the page to create. If a page with this title already exists, content will be appended to the end of the page.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['create'],
					},
				},
				default: '',
				placeholder: 'Page content (each line becomes a line in Cosense)',
				description: 'The content of the page',
			},
			// Insert Lines
			{
				displayName: 'Page Title',
				name: 'insertPageTitle',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['insertLines'],
					},
				},
				default: '',
				placeholder: 'Page Title',
				description: 'The title of the page to insert lines into',
			},
			{
				displayName: 'Line Number',
				name: 'lineNumber',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['insertLines'],
					},
				},
				default: 0,
				description: 'The line number after which to insert the text (0 = beginning of page)',
			},
			{
				displayName: 'Text',
				name: 'insertText',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['insertLines'],
					},
				},
				default: '',
				placeholder: 'Text to insert',
				description: 'The text to insert (each line becomes a line in Cosense)',
			},
			// Search Pages by Title
			{
				displayName: 'Title Query',
				name: 'titleQuery',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['searchPageTitles'],
					},
				},
				default: '',
				placeholder: 'search keyword (optional)',
				description: 'Filter page titles by keyword. Leave empty to get all page titles.',
			},
			{
				displayName: 'Limit',
				name: 'titleSearchLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['searchPageTitles'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 50,
				description: 'Maximum number of search results to return',
			},
			// Search Pages by Full Text
			{
				displayName: 'Query',
				name: 'fullTextQuery',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['searchByFullText'],
					},
				},
				default: '',
				placeholder: 'search keyword',
				description: 'The search query for full text search',
			},
			// Get Snapshot
			{
				displayName: 'Timestamp ID',
				name: 'timestampId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['getSnapshot'],
					},
				},
				default: '',
				placeholder: '5f1234567890abcdef123456',
				description: 'The timestamp ID of the snapshot to retrieve',
			},
			// Project Operations
			{
				displayName: 'Operation',
				name: 'projectOperation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['project'],
					},
				},
				options: [
					{
						name: 'Export Pages',
						value: 'exportPages',
						description: 'Export all pages from a project',
						action: 'Export pages from project',
					},
					{
						name: 'Get Backup',
						value: 'getBackup',
						description: 'Get a specific project backup',
						action: 'Get project backup',
					},
					{
						name: 'Get Backup List',
						value: 'getBackupList',
						description: 'Get list of project backups',
						action: 'Get project backup list',
					},
					{
						name: 'Get Feed',
						value: 'getFeed',
						description: 'Get project feed',
						action: 'Get project feed',
					},
					{
						name: 'Get Info',
						value: 'getInfo',
						description: 'Get project information',
						action: 'Get project information',
					},
					{
						name: 'Get Invitations',
						value: 'getInvitations',
						description: 'Get project invitations',
						action: 'Get project invitations',
					},
					{
						name: 'Get Notifications',
						value: 'getNotifications',
						description: 'Get project notifications',
						action: 'Get project notifications',
					},
					{
						name: 'Get Storage Usage',
						value: 'getStorageUsage',
						description: 'Get project storage usage information',
						action: 'Get project storage usage',
					},
					{
						name: 'Get Stream',
						value: 'getStream',
						description: 'Get project stream (updates)',
						action: 'Get project stream',
					},
					{
						name: 'Import Pages',
						value: 'importPages',
						description: 'Import pages into a project',
						action: 'Import pages to project',
					},
					{
						name: 'Search Query',
						value: 'searchQuery',
						description: 'Search across projects',
						action: 'Search across projects',
					},
					{
						name: 'Search Watch List',
						value: 'searchWatchList',
						description: 'Search in specific projects',
						action: 'Search in specific projects',
					},
				],
				default: 'exportPages',
			},
			// User Operations
			{
				displayName: 'Operation',
				name: 'userOperation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Get Me',
						value: 'getMe',
						description: 'Get current user information',
						action: 'Get current user information',
					},
					{
						name: 'Get Projects',
						value: 'getProjects',
						description: 'Get list of projects the user has access to',
						action: 'Get user projects',
					},
				],
				default: 'getMe',
			},
			// History Operations
			{
				displayName: 'Operation',
				name: 'historyOperation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['history'],
					},
				},
				options: [
					{
						name: 'Get Snapshot',
						value: 'getSnapshot',
						description: 'Get a specific version of a page',
						action: 'Get page snapshot',
					},
					{
						name: 'Get Timestamp IDs',
						value: 'getTimestampIds',
						description: 'Get all timestamp IDs for a page',
						action: 'Get page timestamp IDs',
					},
				],
				default: 'getSnapshot',
			},
			// Export/Import Operations
			{
				displayName: 'Operation',
				name: 'exportImportOperation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['exportImport'],
					},
				},
				options: [
					{
						name: 'Export Project',
						value: 'exportProject',
						description: 'Export entire project data',
						action: 'Export project data',
					},
					{
						name: 'Import Project',
						value: 'importProject',
						description: 'Import project data',
						action: 'Import project data',
					},
				],
				default: 'exportProject',
			},
			// History - Get Snapshot Parameters
			{
				displayName: 'Project Name',
				name: 'projectName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['history'],
					},
				},
				default: '',
				placeholder: 'my-project',
				description: 'The name of your Cosense/Scrapbox project',
			},
			{
				displayName: 'Page Title',
				name: 'historyPageTitle',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['history'],
						historyOperation: ['getSnapshot', 'getTimestampIds'],
					},
				},
				default: '',
				placeholder: 'Page Title',
				description: 'The title of the page to get history for',
			},
			{
				displayName: 'Timestamp ID',
				name: 'timestampId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['history'],
						historyOperation: ['getSnapshot'],
					},
				},
				default: '',
				placeholder: '1234567890',
				description: 'The timestamp ID of the snapshot to retrieve',
			},
			// Project - Project Name Parameter
			{
				displayName: 'Project Name',
				name: 'projectName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						projectOperation: ['exportPages', 'getBackup', 'getBackupList', 'getFeed', 'getInfo', 'getInvitations', 'getNotifications', 'getStorageUsage', 'getStream', 'importPages'],
					},
				},
				default: '',
				placeholder: 'my-project',
				description: 'The name of your Cosense/Scrapbox project',
			},
			// Backup ID (for Get Backup)
			{
				displayName: 'Backup ID',
				name: 'backupId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						projectOperation: ['getBackup'],
					},
				},
				default: '',
				placeholder: '5f1234567890abcdef123456',
				description: 'The ID of the backup to retrieve',
			},
			// Import Pages Parameters
			{
				displayName: 'Pages Data',
				name: 'pagesData',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						projectOperation: ['importPages'],
					},
				},
				default: '[]',
				description: 'JSON array of pages to import',
			},
			// Search Query Parameters
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						projectOperation: ['searchQuery', 'searchWatchList'],
					},
				},
				default: '',
				placeholder: 'search keyword',
				description: 'The search query. Use space to separate AND terms, prefix with - for NOT terms.',
			},
			// Search Watch List Parameters
			{
				displayName: 'Project IDs',
				name: 'projectIds',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						projectOperation: ['searchWatchList'],
					},
				},
				default: '',
				placeholder: 'project1,project2,project3',
				description: 'Comma-separated list of project IDs to search in. Recommended limit: 200-300 projects. Note: Using IDs of projects you are a member of may cause 500 errors.',
			},
			// Export/Import Project Parameters
			{
				displayName: 'Project Name',
				name: 'projectName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['exportImport'],
					},
				},
				default: '',
				placeholder: 'my-project',
				description: 'The name of your Cosense/Scrapbox project',
			},
			// Import Project Parameters
			{
				displayName: 'Project Data',
				name: 'projectData',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['exportImport'],
						exportImportOperation: ['importProject'],
					},
				},
				default: '{}',
				description: 'Complete project data to import',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		
		const credentials = await this.getCredentials('cosenseApi') as CosenseCredentials;

		for (let i = 0; i < items.length; i++) {
			try {
				const apiClient = new CosenseApiClient(this, credentials, i);
				let responseData;
				
				// Get project name based on resource type
				let projectName = '';
				if (['page', 'history', 'exportImport'].includes(resource)) {
					projectName = this.getNodeParameter('projectName', i) as string;
				} else if (resource === 'project') {
					const operation = this.getNodeParameter('projectOperation', i) as string;
					// searchQuery and searchWatchList don't need projectName
					if (!['searchQuery', 'searchWatchList'].includes(operation)) {
						projectName = this.getNodeParameter('projectName', i) as string;
					}
				}

				if (resource === 'page') {
					const operation = this.getNodeParameter('operation', i) as string;
					if (operation === 'get') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						responseData = await apiClient.getPage(projectName, pageTitle);
					} else if (operation === 'getCodeBlocks') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						responseData = await apiClient.getCodeBlocks(projectName, pageTitle);
					} else if (operation === 'getTable') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						const tableFilename = this.getNodeParameter('tableFilename', i) as string;
						responseData = await apiClient.getTable(projectName, pageTitle, tableFilename);
					} else if (operation === 'getText') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						const text = await apiClient.getPageText(projectName, pageTitle);
						responseData = { text };
					} else if (operation === 'list') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await apiClient.listAllPages(projectName);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await apiClient.listPages(projectName, limit, 0);
						}
					} else if (operation === 'searchPageTitles') {
						const query = this.getNodeParameter('titleQuery', i) as string;
						const limit = this.getNodeParameter('titleSearchLimit', i) as number;
						responseData = await apiClient.searchPagesByTitle(projectName, query || undefined, limit);
					} else if (operation === 'searchByFullText') {
						const query = this.getNodeParameter('fullTextQuery', i) as string;
						responseData = await apiClient.searchPagesByFullText(projectName, query);
					} else if (operation === 'create') {
						const title = this.getNodeParameter('createPageTitle', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						// タイトルを最初の行として、その後にコンテンツを追加
						const lines = [title];
						if (content && content.trim()) {
							lines.push(...content.split('\n'));
						}
						responseData = await apiClient.createPage(projectName, { title, lines });
					} else if (operation === 'insertLines') {
						const pageTitle = this.getNodeParameter('insertPageTitle', i) as string;
						const lineNumber = this.getNodeParameter('lineNumber', i) as number;
						const text = this.getNodeParameter('insertText', i) as string;
						responseData = await apiClient.insertLines(projectName, pageTitle, { lineNumber, text });
					} else if (operation === 'getSnapshots') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						const pageId = await apiClient.getPageIdByTitle(projectName, pageTitle);
						responseData = await apiClient.getPageSnapshots(projectName, pageId);
					} else if (operation === 'getSnapshot') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						const timestampId = this.getNodeParameter('timestampId', i) as string;
						const pageId = await apiClient.getPageIdByTitle(projectName, pageTitle);
						responseData = await apiClient.getPageSnapshotByTimestamp(projectName, pageId, timestampId);
					} else if (operation === 'getCommits') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						const pageId = await apiClient.getPageIdByTitle(projectName, pageTitle);
						responseData = await apiClient.getPageCommits(projectName, pageId);
					} else if (operation === 'getIcon') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						responseData = await apiClient.getPageIcon(projectName, pageTitle);
					} else if (operation === 'getDeleted') {
						const pageId = this.getNodeParameter('deletedPageId', i) as string;
						responseData = await apiClient.getDeletedPage(projectName, pageId);
					}
				} else if (resource === 'project') {
					const operation = this.getNodeParameter('projectOperation', i) as string;
					if (operation === 'exportPages') {
						responseData = await apiClient.exportPages(projectName);
					} else if (operation === 'getInfo') {
						responseData = await apiClient.getProjectInfo(projectName);
					} else if (operation === 'getStorageUsage') {
						responseData = await apiClient.getProjectStorageUsage(projectName);
					} else if (operation === 'importPages') {
						const pagesData = this.getNodeParameter('pagesData', i) as string;
						const pages = JSON.parse(pagesData) as JsonObject[];
						responseData = await apiClient.importPages(projectName, pages);
					} else if (operation === 'getBackupList') {
						responseData = await apiClient.getProjectBackupList(projectName);
					} else if (operation === 'getBackup') {
						const backupId = this.getNodeParameter('backupId', i) as string;
						responseData = await apiClient.getProjectBackup(projectName, backupId);
					} else if (operation === 'getStream') {
						responseData = await apiClient.getProjectStream(projectName);
					} else if (operation === 'getNotifications') {
						responseData = await apiClient.getProjectNotifications(projectName);
					} else if (operation === 'getInvitations') {
						responseData = await apiClient.getProjectInvitations(projectName);
					} else if (operation === 'getFeed') {
						responseData = await apiClient.getProjectFeed(projectName);
					} else if (operation === 'searchQuery') {
						const searchQuery = this.getNodeParameter('searchQuery', i) as string;
						responseData = await apiClient.searchProjects(searchQuery);
					} else if (operation === 'searchWatchList') {
						const searchQuery = this.getNodeParameter('searchQuery', i) as string;
						const projectIds = this.getNodeParameter('projectIds', i) as string;
						const ids = projectIds.split(',').map(id => id.trim()).filter(id => id);
						responseData = await apiClient.searchWatchList(searchQuery, ids);
					}
				} else if (resource === 'user') {
					const operation = this.getNodeParameter('userOperation', i) as string;
					if (operation === 'getMe') {
						responseData = await apiClient.getUserInfo();
					} else if (operation === 'getProjects') {
						responseData = await apiClient.getProjects();
					}
				} else if (resource === 'history') {
					const operation = this.getNodeParameter('historyOperation', i) as string;
					const pageTitle = this.getNodeParameter('historyPageTitle', i) as string;
					if (operation === 'getSnapshot') {
						const timestampId = this.getNodeParameter('timestampId', i) as string;
						responseData = await apiClient.getSnapshot(projectName, pageTitle, timestampId);
					} else if (operation === 'getTimestampIds') {
						responseData = await apiClient.getTimestampIds(projectName, pageTitle);
					}
				} else if (resource === 'exportImport') {
					const operation = this.getNodeParameter('exportImportOperation', i) as string;
					if (operation === 'exportProject') {
						responseData = await apiClient.exportPages(projectName);
					} else if (operation === 'importProject') {
						const projectData = this.getNodeParameter('projectData', i) as string;
						const data = JSON.parse(projectData) as JsonObject;
						// Handle project data format
						const pages = Array.isArray(data) ? data : data.pages as JsonObject[] || [];
						responseData = await apiClient.importPages(projectName, pages);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push(...responseData.map(item => ({
						json: item as JsonObject,
						pairedItem: { item: i },
					})));
				} else {
					returnData.push({
						json: responseData as JsonObject,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						} as JsonObject,
						error,
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}