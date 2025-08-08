/**
 * Cosense API クライアント - API通信の共通処理を提供
 */
import type { IExecuteFunctions, IHttpRequestOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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

	async getPage(pageTitle: string): Promise<PageData> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/pages/${this.projectName}/${encodeURIComponent(pageTitle)}`;

		try {
			const response = await this.executeFunctions.helpers.httpRequest(options);
			return response as PageData;
		} catch (error: any) {
			if (error.response?.statusCode === 404) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: `Page "${pageTitle}" not found in project "${this.projectName}"`,
				});
			}
			if (error.response?.statusCode === 401) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Authentication failed. Please check your session ID.',
				});
			}
			throw error;
		}
	}

	async listPages(limit: number, skip: number): Promise<JsonObject[]> {
		const options = this.getRequestOptions();
		options.url = `${this.baseUrl}/pages/${this.projectName}?limit=${limit}&skip=${skip}`;

		try {
			const response = await this.executeFunctions.helpers.httpRequest(options);
			return response as JsonObject[];
		} catch (error: any) {
			if (error.response?.statusCode === 401) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Authentication failed. Please check your session ID.',
				});
			}
			throw error;
		}
	}

	async searchPages(query: string, searchType: 'title' | 'fulltext', limit?: number): Promise<JsonObject[]> {
		const options = this.getRequestOptions();
		
		if (searchType === 'title') {
			options.url = `${this.baseUrl}/pages/${this.projectName}/search/titles?q=${encodeURIComponent(query)}`;
		} else {
			options.url = `${this.baseUrl}/pages/${this.projectName}/search/query?q=${encodeURIComponent(query)}&limit=${limit || 50}`;
		}

		try {
			const response = await this.executeFunctions.helpers.httpRequest(options);
			return response as JsonObject[];
		} catch (error: any) {
			if (error.response?.statusCode === 401) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Authentication failed. Please check your session ID.',
				});
			}
			throw error;
		}
	}

	async createPage(data: CreatePageData): Promise<PageData> {
		if (this.authenticationType === 'serviceAccount') {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Service Account authentication does not support write operations. Please use Session Cookie authentication.',
			});
		}
		if (!this.sessionId) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Session ID is required for creating pages. Please add your credentials.',
			});
		}

		const options = this.getRequestOptions('POST');
		options.url = `${this.baseUrl}/pages/${this.projectName}/${encodeURIComponent(data.title)}`;
		options.body = {
			lines: data.lines,
		};

		try {
			const response = await this.executeFunctions.helpers.httpRequest(options);
			return response as PageData;
		} catch (error: any) {
			if (error.response?.statusCode === 401) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Authentication failed. Please check your session ID.',
				});
			}
			if (error.response?.statusCode === 409) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: `Page "${data.title}" already exists in project "${this.projectName}"`,
				});
			}
			throw error;
		}
	}

	async insertLines(pageTitle: string, data: InsertLinesData): Promise<PageData> {
		if (this.authenticationType === 'serviceAccount') {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Service Account authentication does not support write operations. Please use Session Cookie authentication.',
			});
		}
		if (!this.sessionId) {
			throw new NodeApiError(this.executeFunctions.getNode(), {}, {
				message: 'Session ID is required for editing pages. Please add your credentials.',
			});
		}

		// まず既存のページを取得
		const existingPage = await this.getPage(pageTitle);
		
		// 新しい行配列を作成
		const newLines = [...existingPage.lines];
		const textLines = data.text.split('\n');
		
		// 指定した行番号の後に挿入
		newLines.splice(data.lineNumber + 1, 0, ...textLines);

		const options = this.getRequestOptions('POST');
		options.url = `${this.baseUrl}/pages/${this.projectName}/${encodeURIComponent(pageTitle)}`;
		options.body = {
			lines: newLines,
		};

		try {
			const response = await this.executeFunctions.helpers.httpRequest(options);
			return response as PageData;
		} catch (error: any) {
			if (error.response?.statusCode === 401) {
				throw new NodeApiError(this.executeFunctions.getNode(), error, {
					message: 'Authentication failed. Please check your session ID.',
				});
			}
			throw error;
		}
	}
}