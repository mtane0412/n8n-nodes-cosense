/**
 * Cosense (旧Scrapbox) のページ管理と検索機能を提供するn8nノード
 */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionType } from 'n8n-workflow';

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
						name: 'Get',
						value: 'get',
						description: 'Get a page by title',
						action: 'Get a page',
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

		const credentials = await this.getCredentials('cosenseApi');
		const projectName = credentials.projectName as string;
		const sessionId = credentials.sessionId as string;

		const baseUrl = 'https://scrapbox.io/api';

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;
				const options: IHttpRequestOptions = {
					method: 'GET',
					url: '',
					json: true,
				};

				// セッションIDが設定されている場合はCookieを追加
				if (sessionId) {
					options.headers = {
						Cookie: `connect.sid=${sessionId}`,
					};
				}

				if (resource === 'page') {
					if (operation === 'get') {
						const pageTitle = this.getNodeParameter('pageTitle', i) as string;
						options.url = `${baseUrl}/pages/${projectName}/${encodeURIComponent(pageTitle)}`;
						
						try {
							responseData = await this.helpers.httpRequest(options);
						} catch (error: any) {
							if (error.response?.statusCode === 404) {
								throw new NodeApiError(this.getNode(), error, {
									message: `Page "${pageTitle}" not found in project "${projectName}"`,
								});
							}
							throw error;
						}
					} else if (operation === 'list') {
						const limit = this.getNodeParameter('limit', i) as number;
						const skip = this.getNodeParameter('skip', i) as number;
						
						options.url = `${baseUrl}/pages/${projectName}?limit=${limit}&skip=${skip}`;
						responseData = await this.helpers.httpRequest(options);
					} else if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						const searchType = this.getNodeParameter('searchType', i) as string;
						const limit = this.getNodeParameter('searchLimit', i) as number;
						
						if (searchType === 'title') {
							options.url = `${baseUrl}/pages/${projectName}/search/titles?q=${encodeURIComponent(query)}`;
						} else {
							options.url = `${baseUrl}/pages/${projectName}/search/query?q=${encodeURIComponent(query)}&limit=${limit}`;
						}
						
						responseData = await this.helpers.httpRequest(options);
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
					if (error.response?.statusCode === 401) {
						throw new NodeApiError(this.getNode(), error, {
							message: 'Authentication failed. Please check your session ID.',
						});
					}
					throw error;
				}
			}
		}

		return [returnData];
	}
}