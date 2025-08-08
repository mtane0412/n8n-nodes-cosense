/**
 * Cosense API クライアント - API通信の共通処理を提供
 */
import type { IExecuteFunctions, IHttpRequestOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { CosenseWebSocketClient } from './CosenseWebSocketClient';

export interface CosenseCredentials {
	projectName: string;
	authenticationType?: 'sessionCookie' | 'serviceAccount';
	sessionId?: string;
	serviceAccountKey?: string;
}

export interface PageData {
	title: string;
	lines: string[];
	id?: string;
	created?: number;
	updated?: number;
	pin?: number;
	[key: string]: any; // Index signatureを追加してJsonObjectと互換性を保つ
}

export interface CreatePageData {
	title: string;
	lines: string[];
}

export interface InsertLinesData {
	lineNumber: number;
	text: string;
}

export class CosenseApiClient {
	private baseUrl = 'https://scrapbox.io/api';
	private projectName: string;
	private authenticationType?: 'sessionCookie' | 'serviceAccount';
	private sessionId?: string;
	private serviceAccountKey?: string;
	private executeFunctions: IExecuteFunctions;
	
	// レート制限設定
	private static readonly MAX_RETRIES = 3;
	private static readonly INITIAL_RETRY_DELAY = 1000; // 1秒
	private static readonly MAX_RETRY_DELAY = 60000; // 60秒
	constructor(executeFunctions: IExecuteFunctions, credentials: CosenseCredentials, itemIndex: number) {
		this.executeFunctions = executeFunctions;
		this.projectName = credentials.projectName;
		this.authenticationType = credentials.authenticationType;
		this.sessionId = credentials.sessionId;
		this.serviceAccountKey = credentials.serviceAccountKey;
		// itemIndexは現在使用していないが、将来の拡張を考慮して引数のみ保持
	}

	private getRequestOptions(method: 'GET' | 'POST' = 'GET'): IHttpRequestOptions {
		const options: IHttpRequestOptions = {
			method,
			url: '',
			json: true,
		};

		if (this.authenticationType === 'serviceAccount' && this.serviceAccountKey) {
			options.headers = {
				'x-service-account-access-key': this.serviceAccountKey,
			};
		} else if (this.sessionId) {
			options.headers = {
				Cookie: `connect.sid=${this.sessionId}`,
			};
		}

		return options;
	}

	private async delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private async executeWithRetry<T>(
		operation: () => Promise<T>,
		operationName: string,
	): Promise<T> {
		let lastError: any;
		
		for (let attempt = 0; attempt <= CosenseApiClient.MAX_RETRIES; attempt++) {
			try {
				return await operation();
			} catch (error: any) {
				lastError = error;
				
				// レート制限エラー（429）の場合のみリトライ
				if (error.response?.statusCode === 429 && attempt < CosenseApiClient.MAX_RETRIES) {
					// エクスポネンシャルバックオフ: 1s, 2s, 4s...
					const delay = Math.min(
						CosenseApiClient.INITIAL_RETRY_DELAY * Math.pow(2, attempt),
						CosenseApiClient.MAX_RETRY_DELAY
					);
					
					console.log(`Rate limited. Retrying ${operationName} after ${delay}ms (attempt ${attempt + 1}/${CosenseApiClient.MAX_RETRIES})...`);
					await this.delay(delay);
					continue;
				}
				
				// その他のエラーまたは最大リトライ回数に達した場合は即座にスロー
				throw error;
			}
		}
		
		// ここには到達しないはずだが、TypeScriptのために
		throw lastError;
	}

	async getPage(pageTitle: string): Promise<PageData> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/pages/${this.projectName}/${encodeURIComponent(pageTitle)}`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as PageData;
			} catch (error: any) {
				if (error.response?.statusCode === 404) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: `Page "${pageTitle}" not found in project "${this.projectName}". Please check if the page title is correct and the page exists.`,
						description: 'The requested page could not be found. This might happen if the page was deleted or the title is misspelled.',
					});
				}
				if (error.response?.statusCode === 401) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: 'Authentication failed. Your session may have expired or the credentials are incorrect.',
						description: this.authenticationType === 'serviceAccount' 
							? 'Please verify your Service Account Access Key is valid and has access to this project.'
							: 'Please get a fresh session ID from your browser cookies after logging into Cosense.',
					});
				}
				throw error;
			}
		}, `getPage(${pageTitle})`);
	}

	async listPages(limit: number, skip: number): Promise<JsonObject[]> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/pages/${this.projectName}?limit=${limit}&skip=${skip}`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as JsonObject[];
			} catch (error: any) {
				if (error.response?.statusCode === 401) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: 'Authentication failed. Your session may have expired or the credentials are incorrect.',
						description: this.authenticationType === 'serviceAccount' 
							? 'Please verify your Service Account Access Key is valid and has access to this project.'
							: 'Please get a fresh session ID from your browser cookies after logging into Cosense.',
					});
				}
				throw error;
			}
		}, `listPages(limit=${limit}, skip=${skip})`);
	}

	async listAllPages(): Promise<JsonObject[]> {
		const allPages: JsonObject[] = [];
		const pageSize = 100;
		let skip = 0;
		let hasMore = true;

		while (hasMore) {
			const pages = await this.listPages(pageSize, skip);
			allPages.push(...pages);
			
			if (pages.length < pageSize) {
				hasMore = false;
			} else {
				skip += pageSize;
			}
		}

		return allPages;
	}

	async searchPages(query: string, searchType: 'title' | 'fulltext', limit?: number): Promise<JsonObject[]> {
		const options = this.getRequestOptions();
		
		if (searchType === 'title') {
			// /search/titles エンドポイントは全ページを返すので、クライアント側でフィルタリング
			options.url = `${this.baseUrl}/pages/${this.projectName}/search/titles`;
			
			return this.executeWithRetry(async () => {
				try {
					const response = await this.executeFunctions.helpers.httpRequest(options) as JsonObject[];
					// クエリに基づいてタイトルをフィルタリング（大文字小文字を無視）
					const filtered = response.filter(page => 
						(page.title as string).toLowerCase().includes(query.toLowerCase())
					);
					// limit が指定されていれば、その数だけ返す
					return limit ? filtered.slice(0, limit) : filtered;
				} catch (error: any) {
					if (error.response?.statusCode === 401) {
						throw new NodeApiError(this.executeFunctions.getNode(), error, {
							message: 'Authentication failed. Your session may have expired or the credentials are incorrect.',
							description: this.authenticationType === 'serviceAccount' 
								? 'Please verify your Service Account Access Key is valid and has access to this project.'
								: 'Please get a fresh session ID from your browser cookies after logging into Cosense.',
						});
					}
					throw error;
				}
			}, `searchPages(${query}, ${searchType})`);
		} else {
			// フルテキスト検索
			options.url = `${this.baseUrl}/pages/${this.projectName}/search/query?q=${encodeURIComponent(query)}&limit=${limit || 50}`;
			
			return this.executeWithRetry(async () => {
				try {
					const response = await this.executeFunctions.helpers.httpRequest(options);
					return response as JsonObject[];
				} catch (error: any) {
					if (error.response?.statusCode === 401) {
						throw new NodeApiError(this.executeFunctions.getNode(), error, {
							message: 'Authentication failed. Your session may have expired or the credentials are incorrect.',
							description: this.authenticationType === 'serviceAccount' 
								? 'Please verify your Service Account Access Key is valid and has access to this project.'
								: 'Please get a fresh session ID from your browser cookies after logging into Cosense.',
						});
					}
					throw error;
				}
			}, `searchPages(${query}, ${searchType})`);
		}
	}

	async createPage(data: CreatePageData): Promise<PageData> {
		if (this.authenticationType === 'serviceAccount') {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Service Account authentication does not support write operations',
				description: 'Service Accounts are limited to read-only access. To create pages, please switch to Session Cookie authentication in the node credentials.',
			});
		}
		if (!this.sessionId) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Session ID is required for creating pages',
				description: 'Please configure your Cosense credentials with a valid session ID. You can get this from your browser cookies after logging into Cosense.',
			});
		}

		try {
			// まず既存のページが存在するかチェック
			let existingPage: PageData | null = null;
			try {
				existingPage = await this.getPage(data.title);
			} catch (error: any) {
				// 404エラーの場合はページが存在しないので、新規作成可能
				if (error.response?.statusCode !== 404) {
					throw error; // その他のエラーは再スロー
				}
			}

			const wsClient = new CosenseWebSocketClient({ sessionId: this.sessionId });
			const content = data.lines.slice(1).join('\n'); // 最初の行はタイトルなので除外

			if (existingPage) {
				// 既存ページが存在する場合は末尾に追加
				const lastLineNumber = existingPage.lines.length; // 最後の行の次の位置
				await wsClient.insertLines(this.projectName, data.title, lastLineNumber, content);
			} else {
				// 新規ページ作成
				await wsClient.createPage(this.projectName, data.title, content);
			}
			
			// 作成/更新後にページを取得して返す
			return await this.getPage(data.title);
		} catch (error: any) {
			throw new NodeApiError(this.executeFunctions.getNode(), error, {
				message: 'Failed to create or update page',
				description: error.message || 'An error occurred while creating or updating the page',
			});
		}
	}

	async insertLines(pageTitle: string, data: InsertLinesData): Promise<PageData> {
		if (this.authenticationType === 'serviceAccount') {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Service Account authentication does not support write operations',
				description: 'Service Accounts are limited to read-only access. To edit pages, please switch to Session Cookie authentication in the node credentials.',
			});
		}
		if (!this.sessionId) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Session ID is required for editing pages',
				description: 'Please configure your Cosense credentials with a valid session ID. You can get this from your browser cookies after logging into Cosense.',
			});
		}

		try {
			// WebSocketを使用して行を挿入
			const wsClient = new CosenseWebSocketClient({ sessionId: this.sessionId });
			await wsClient.insertLines(this.projectName, pageTitle, data.lineNumber, data.text);
			
			// 更新後にページを取得して返す
			return await this.getPage(pageTitle);
		} catch (error: any) {
			throw new NodeApiError(this.executeFunctions.getNode(), error, {
				message: 'Failed to insert lines',
				description: error.message || 'An error occurred while inserting lines',
			});
		}
	}

	// Export/Import Methods
	async exportPages(): Promise<JsonObject[]> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/pages/${this.projectName}?limit=10000`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as JsonObject[];
			} catch (error: any) {
				if (error.response?.statusCode === 401) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: 'Authentication failed. Your session may have expired or the credentials are incorrect.',
						description: this.authenticationType === 'serviceAccount' 
							? 'Please verify your Service Account Access Key is valid and has access to this project.'
							: 'Please get a fresh session ID from your browser cookies after logging into Cosense.',
					});
				}
				throw error;
			}
		}, 'exportPages');
	}

	async importPages(pages: JsonObject[]): Promise<JsonObject> {
		if (this.authenticationType === 'serviceAccount') {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Service Account authentication does not support write operations',
				description: 'Service Accounts are limited to read-only access. To import pages, please switch to Session Cookie authentication in the node credentials.',
			});
		}
		if (!this.sessionId) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Session ID is required for importing pages',
				description: 'Please configure your Cosense credentials with a valid session ID. You can get this from your browser cookies after logging into Cosense.',
			});
		}

		const wsClient = new CosenseWebSocketClient({ sessionId: this.sessionId });
		let imported = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const page of pages) {
			try {
				if (typeof page.title === 'string' && Array.isArray(page.lines)) {
					await wsClient.createPage(this.projectName, page.title, page.lines.slice(1).join('\n'));
					imported++;
				} else {
					failed++;
					errors.push(`Invalid page format: ${JSON.stringify(page)}`);
				}
			} catch (error: any) {
				failed++;
				errors.push(`Failed to import "${page.title}": ${error.message}`);
			}
		}

		return {
			imported,
			failed,
			total: pages.length,
			errors: errors.slice(0, 10), // Limit errors to first 10
		};
	}

	// History Methods
	async getSnapshot(pageTitle: string, timestampId: string): Promise<PageData> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/pages/${this.projectName}/${encodeURIComponent(pageTitle)}/${timestampId}`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as PageData;
			} catch (error: any) {
				if (error.response?.statusCode === 404) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: `Snapshot not found for page "${pageTitle}" with timestamp "${timestampId}"`,
						description: 'The requested snapshot could not be found. Please verify the page title and timestamp ID.',
					});
				}
				if (error.response?.statusCode === 401) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: 'Authentication failed. Your session may have expired or the credentials are incorrect.',
						description: this.authenticationType === 'serviceAccount' 
							? 'Please verify your Service Account Access Key is valid and has access to this project.'
							: 'Please get a fresh session ID from your browser cookies after logging into Cosense.',
					});
				}
				throw error;
			}
		}, `getSnapshot(${pageTitle}, ${timestampId})`);
	}

	async getTimestampIds(pageTitle: string): Promise<JsonObject[]> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/pages/${this.projectName}/${encodeURIComponent(pageTitle)}/timestamps`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as JsonObject[];
			} catch (error: any) {
				if (error.response?.statusCode === 404) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: `Page "${pageTitle}" not found`,
						description: 'The requested page could not be found. Please verify the page title.',
					});
				}
				if (error.response?.statusCode === 401) {
					throw new NodeApiError(this.executeFunctions.getNode(), error, {
						message: 'Authentication failed. Your session may have expired or the credentials are incorrect.',
						description: this.authenticationType === 'serviceAccount' 
							? 'Please verify your Service Account Access Key is valid and has access to this project.'
							: 'Please get a fresh session ID from your browser cookies after logging into Cosense.',
					});
				}
				throw error;
			}
		}, `getTimestampIds(${pageTitle})`);
	}

	// Content Analysis Methods
	async getCodeBlocks(pageTitle: string): Promise<JsonObject[]> {
		const page = await this.getPage(pageTitle);
		const codeBlocks: JsonObject[] = [];
		let inCodeBlock = false;
		let currentBlock: string[] = [];
		let language = '';
		let startLine = 0;

		page.lines.forEach((line, index) => {
			// lineがオブジェクトの場合はtextプロパティを取得、文字列の場合はそのまま使用
			const lineText = typeof line === 'string' ? line : (line as any).text || '';
			const trimmedLine = lineText.trim();
			if (trimmedLine.startsWith('code:')) {
				if (inCodeBlock && currentBlock.length > 0) {
					codeBlocks.push({
						language,
						code: currentBlock.join('\n'),
						startLine,
						endLine: index - 1,
					});
				}
				inCodeBlock = true;
				language = trimmedLine.substring(5).trim();
				currentBlock = [];
				startLine = index + 1;
			} else if (inCodeBlock) {
				if (lineText.startsWith(' ') || lineText.startsWith('\t')) {
					currentBlock.push(lineText.replace(/^[ \t]/, ''));
				} else {
					if (currentBlock.length > 0) {
						codeBlocks.push({
							language,
							code: currentBlock.join('\n'),
							startLine,
							endLine: index - 1,
						});
					}
					inCodeBlock = false;
					currentBlock = [];
				}
			}
		});

		// Handle last code block if exists
		if (inCodeBlock && currentBlock.length > 0) {
			codeBlocks.push({
				language,
				code: currentBlock.join('\n'),
				startLine,
				endLine: page.lines.length - 1,
			});
		}

		return codeBlocks;
	}

	// Security Methods
	async getCSRFToken(): Promise<JsonObject> {
		if (!this.sessionId) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Session ID is required for getting CSRF token',
				description: 'Please configure your Cosense credentials with a valid session ID.',
			});
		}

		const options = this.getRequestOptions();
		options.url = `https://scrapbox.io/${this.projectName}`;
		options.returnFullResponse = true;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				// Extract CSRF token from response HTML or headers
				// This is a simplified implementation - actual implementation may vary
				const csrfToken = response.headers['x-csrf-token'] || 'not-found';
				return { token: csrfToken };
			} catch (error: any) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Failed to get CSRF token',
					description: error.message || 'An error occurred while getting CSRF token',
				});
			}
		}, 'getCSRFToken');
	}

	// External Integration Methods
	async getGyazoToken(): Promise<JsonObject> {
		if (!this.sessionId) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Session ID is required for getting Gyazo token',
				description: 'Please configure your Cosense credentials with a valid session ID.',
			});
		}

		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/gyazo/token`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as JsonObject;
			} catch (error: any) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Failed to get Gyazo OAuth token',
					description: 'Make sure you are authenticated and have Gyazo integration enabled.',
				});
			}
		}, 'getGyazoToken');
	}

	async getTweetInfo(tweetUrl: string): Promise<JsonObject> {
		const options = this.getRequestOptions();
		// Extract tweet ID from URL
		const tweetIdMatch = tweetUrl.match(/status\/(\d+)/);
		if (!tweetIdMatch) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Invalid tweet URL',
				description: 'Please provide a valid Twitter/X status URL.',
			});
		}

		options.url = `${this.baseUrl}/tweet/${tweetIdMatch[1]}`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as JsonObject;
			} catch (error: any) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Failed to get tweet information',
					description: error.message || 'An error occurred while fetching tweet information',
				});
			}
		}, `getTweetInfo(${tweetUrl})`);
	}

	async getWebPageTitle(url: string): Promise<JsonObject> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/webpage/title?url=${encodeURIComponent(url)}`;

		return this.executeWithRetry(async () => {
			try {
				const response = await this.executeFunctions.helpers.httpRequest(options);
				return response as JsonObject;
			} catch (error: any) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Failed to get web page title',
					description: error.message || 'An error occurred while fetching web page title',
				});
			}
		}, `getWebPageTitle(${url})`);
	}
}