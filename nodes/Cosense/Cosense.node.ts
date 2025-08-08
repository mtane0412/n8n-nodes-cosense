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
		subtitle: '={{($parameter["resource"] === "page" ? $parameter["operation"] : $parameter["resource"] === "project" ? $parameter["projectOperation"] : $parameter["resource"] === "history" ? $parameter["historyOperation"] : $parameter["resource"] === "exportImport" ? $parameter["exportImportOperation"] : $parameter["resource"] === "user" ? $parameter["userOperation"] : $parameter["externalOperation"]) + ": " + $parameter["resource"]}}',
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
						name: 'External',
						value: 'external',
						description: 'External service integrations',
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
						name: 'Get Table',
						value: 'getTable',
						description: 'Get table data from a page as CSV',
						action: 'Get table data',
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
						name: 'Search',
						value: 'search',
						description: 'Search pages by keyword',
						action: 'Search pages',
					},
				],
				default: 'get',
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
						operation: ['get', 'getCodeBlocks', 'getTable'],
					},
				},
				default: '',
				placeholder: 'My Page Title',
				description: 'The title of the page to get',
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
			// Search Pages
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['search'],
					},
				},
				default: '',
				placeholder: 'search keyword',
				description: 'The search query',
			},
			{
				displayName: 'Search Type',
				name: 'searchType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['search'],
					},
				},
				options: [
					{
						name: 'Title',
						value: 'title',
						description: 'Search in page titles only',
					},
					{
						name: 'Full Text',
						value: 'fulltext',
						description: 'Search in page content',
					},
				],
				default: 'title',
				description: 'Type of search to perform',
			},
			{
				displayName: 'Limit',
				name: 'searchLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['search'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 50,
				description: 'Maximum number of search results to return',
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
						name: 'Get Info',
						value: 'getInfo',
						description: 'Get project information',
						action: 'Get project information',
					},
					{
						name: 'Import Pages',
						value: 'importPages',
						description: 'Import pages into a project',
						action: 'Import pages to project',
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
			// External Operations
			{
				displayName: 'Operation',
				name: 'externalOperation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['external'],
					},
				},
				options: [
					{
						name: 'Get CSRF Token',
						value: 'getCSRFToken',
						description: 'Get CSRF token for secure requests',
						action: 'Get CSRF token',
					},
					{
						name: 'Get Gyazo Token',
						value: 'getGyazoToken',
						description: 'Get OAuth token for Gyazo uploads',
						action: 'Get Gyazo token',
					},
					{
						name: 'Get Tweet Info',
						value: 'getTweetInfo',
						description: 'Get information about a tweet',
						action: 'Get tweet information',
					},
					{
						name: 'Get Web Page Title',
						value: 'getWebPageTitle',
						description: 'Get title of a web page',
						action: 'Get web page title',
					},
				],
				default: 'getCSRFToken',
			},
			// History - Get Snapshot Parameters
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
			// Project - Get Info Parameters
			{
				displayName: 'Project Name',
				name: 'projectNameParam',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['project'],
						projectOperation: ['getInfo'],
					},
				},
				default: '',
				placeholder: 'project-name',
				description: 'Name of the project to get info for. Leave empty to use the project from credentials.',
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
			// External - Tweet Info Parameters
			{
				displayName: 'Tweet URL',
				name: 'tweetUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['external'],
						externalOperation: ['getTweetInfo'],
					},
				},
				default: '',
				placeholder: 'https://twitter.com/user/status/1234567890',
				description: 'The URL of the tweet to get information for',
			},
			// External - Web Page Title Parameters
			{
				displayName: 'URL',
				name: 'webPageUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['external'],
						externalOperation: ['getWebPageTitle'],
					},
				},
				default: '',
				placeholder: 'https://example.com',
				description: 'The URL of the web page to get the title for',
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

				if (resource === 'page') {
					const operation = this.getNodeParameter('operation', i) as string;
					if (operation === 'get') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						responseData = await apiClient.getPage(pageTitle);
					} else if (operation === 'getCodeBlocks') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						responseData = await apiClient.getCodeBlocks(pageTitle);
					} else if (operation === 'getTable') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						const tableFilename = this.getNodeParameter('tableFilename', i) as string;
						responseData = await apiClient.getTable(pageTitle, tableFilename);
					} else if (operation === 'list') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await apiClient.listAllPages();
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await apiClient.listPages(limit, 0);
						}
					} else if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						const searchType = this.getNodeParameter('searchType', i) as string;
						const limit = this.getNodeParameter('searchLimit', i) as number;
						responseData = await apiClient.searchPages(query, searchType as 'title' | 'fulltext', limit);
					} else if (operation === 'create') {
						const title = this.getNodeParameter('createPageTitle', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						// タイトルを最初の行として、その後にコンテンツを追加
						const lines = [title];
						if (content && content.trim()) {
							lines.push(...content.split('\n'));
						}
						responseData = await apiClient.createPage({ title, lines });
					} else if (operation === 'insertLines') {
						const pageTitle = this.getNodeParameter('insertPageTitle', i) as string;
						const lineNumber = this.getNodeParameter('lineNumber', i) as number;
						const text = this.getNodeParameter('insertText', i) as string;
						responseData = await apiClient.insertLines(pageTitle, { lineNumber, text });
					}
				} else if (resource === 'project') {
					const operation = this.getNodeParameter('projectOperation', i) as string;
					if (operation === 'exportPages') {
						responseData = await apiClient.exportPages();
					} else if (operation === 'getInfo') {
						const projectName = this.getNodeParameter('projectNameParam', i) as string;
						responseData = await apiClient.getProjectInfo(projectName || undefined);
					} else if (operation === 'importPages') {
						const pagesData = this.getNodeParameter('pagesData', i) as string;
						const pages = JSON.parse(pagesData) as JsonObject[];
						responseData = await apiClient.importPages(pages);
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
						responseData = await apiClient.getSnapshot(pageTitle, timestampId);
					} else if (operation === 'getTimestampIds') {
						responseData = await apiClient.getTimestampIds(pageTitle);
					}
				} else if (resource === 'exportImport') {
					const operation = this.getNodeParameter('exportImportOperation', i) as string;
					if (operation === 'exportProject') {
						responseData = await apiClient.exportPages();
					} else if (operation === 'importProject') {
						const projectData = this.getNodeParameter('projectData', i) as string;
						const data = JSON.parse(projectData) as JsonObject;
						// Handle project data format
						const pages = Array.isArray(data) ? data : data.pages as JsonObject[] || [];
						responseData = await apiClient.importPages(pages);
					}
				} else if (resource === 'external') {
					const operation = this.getNodeParameter('externalOperation', i) as string;
					if (operation === 'getCSRFToken') {
						responseData = await apiClient.getCSRFToken();
					} else if (operation === 'getGyazoToken') {
						responseData = await apiClient.getGyazoToken();
					} else if (operation === 'getTweetInfo') {
						const tweetUrl = this.getNodeParameter('tweetUrl', i) as string;
						responseData = await apiClient.getTweetInfo(tweetUrl);
					} else if (operation === 'getWebPageTitle') {
						const url = this.getNodeParameter('webPageUrl', i) as string;
						responseData = await apiClient.getWebPageTitle(url);
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