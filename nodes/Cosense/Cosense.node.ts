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
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
						name: 'Page',
						value: 'page',
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
						description: 'Create a new page',
						action: 'Create a page',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a page by title',
						action: 'Get a page',
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
						operation: ['get'],
					},
				},
				default: '',
				placeholder: 'My Page Title',
				description: 'The title of the page to get',
			},
			// List Pages
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['list'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['page'],
						operation: ['list'],
					},
				},
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Number of pages to skip',
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
				description: 'The title of the page to create',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const credentials = await this.getCredentials('cosenseApi') as CosenseCredentials;

		for (let i = 0; i < items.length; i++) {
			try {
				const apiClient = new CosenseApiClient(this, credentials, i);
				let responseData;

				if (resource === 'page') {
					if (operation === 'get') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						responseData = await apiClient.getPage(pageTitle);
					} else if (operation === 'list') {
						const limit = this.getNodeParameter('limit', i) as number;
						const skip = this.getNodeParameter('skip', i) as number;
						responseData = await apiClient.listPages(limit, skip);
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